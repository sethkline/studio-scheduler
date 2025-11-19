import { requireAuth, requireRole } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'
import type { ParentDashboardStats } from '~/types/parents'

export default defineEventHandler(async (event) => {  await requireRole(event, ['parent', 'admin', 'staff'])

  const client = await getUserSupabaseClient(event)
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  try {
    // Get guardian record for this user
    const { data: guardian, error: guardianError } = await client
      .from('guardians')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (guardianError || !guardian) {
      throw createError({
        statusCode: 404,
        message: 'Guardian profile not found',
      })
    }

    // Get all students linked to this guardian
    const { data: relationships, error: relationshipsError } = await client
      .from('student_guardian_relationships')
      .select(`
        *,
        student:students(*)
      `)
      .eq('guardian_id', guardian.id)

    if (relationshipsError) throw relationshipsError

    const students = relationships?.map((rel: any) => ({
      ...rel.student,
      relationship: {
        relationship: rel.relationship,
        relationship_custom: rel.relationship_custom,
        primary_contact: rel.primary_contact,
        authorized_pickup: rel.authorized_pickup,
        financial_responsibility: rel.financial_responsibility,
        can_authorize_medical: rel.can_authorize_medical,
      },
    })) || []

    const studentIds = students.map((s: any) => s.id)

    // Get active enrollments count
    let activeEnrollments = 0
    if (studentIds.length > 0) {
      const { count } = await client
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .in('student_id', studentIds)
        .eq('status', 'active')

      activeEnrollments = count || 0
    }

    // Get upcoming recitals
    const { data: upcomingRecitals, error: recitalsError } = await client
      .from('recital_shows')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(5)

    if (recitalsError) throw recitalsError

    // Get weekly schedule for all students
    let weeklySchedule: any[] = []
    if (studentIds.length > 0) {
      const { data: enrollmentsWithClasses, error: scheduleError } = await client
        .from('enrollments')
        .select(`
          *,
          student:students(id, first_name, last_name),
          class_instance:class_instances(
            id,
            name,
            schedule_classes(
              day_of_week,
              start_time,
              end_time,
              studio_rooms(name)
            ),
            class_definition:class_definitions(
              name,
              dance_style:dance_styles(name, color)
            ),
            teacher:profiles(first_name, last_name)
          )
        `)
        .in('student_id', studentIds)
        .eq('status', 'active')

      if (!scheduleError && enrollmentsWithClasses) {
        weeklySchedule = enrollmentsWithClasses
          .filter((enrollment: any) => enrollment.class_instance)
          .flatMap((enrollment: any) => {
            const classInstance = enrollment.class_instance
            const scheduleClasses = classInstance.schedule_classes || []

            return scheduleClasses.map((sc: any) => ({
              id: `${enrollment.id}-${sc.day_of_week}`,
              student_id: enrollment.student.id,
              student_name: `${enrollment.student.first_name} ${enrollment.student.last_name}`,
              class_name: classInstance.class_definition?.name || classInstance.name,
              class_instance_id: classInstance.id,
              day_of_week: sc.day_of_week,
              start_time: sc.start_time,
              end_time: sc.end_time,
              location: sc.studio_rooms?.name,
              teacher_name: classInstance.teacher
                ? `${classInstance.teacher.first_name} ${classInstance.teacher.last_name}`
                : null,
              dance_style: classInstance.class_definition?.dance_style?.name,
              dance_style_color: classInstance.class_definition?.dance_style?.color,
            }))
          })
      }
    }

    // Get outstanding costumes (assigned or picked_up status)
    let outstandingCostumes = 0
    if (studentIds.length > 0) {
      const { count } = await client
        .from('costume_assignments')
        .select('*', { count: 'exact', head: true })
        .in('student_id', studentIds)
        .in('status', ['assigned', 'picked_up'])

      outstandingCostumes = count || 0
    }

    // Get volunteer requirements for this guardian
    let requiredVolunteerHours = 0
    let completedVolunteerHours = 0

    const { data: volunteerRequirements } = await client
      .from('volunteer_requirements')
      .select('required_hours, completed_hours')
      .eq('guardian_id', guardian.id)

    if (volunteerRequirements && volunteerRequirements.length > 0) {
      requiredVolunteerHours = volunteerRequirements.reduce((sum, req) => sum + (req.required_hours || 0), 0)
      completedVolunteerHours = volunteerRequirements.reduce((sum, req) => sum + (req.completed_hours || 0), 0)
    }

    // TODO: Get pending payments
    // This will need its own tables/logic

    // Build dashboard stats
    const stats: ParentDashboardStats = {
      total_students: students.length,
      active_enrollments: activeEnrollments,
      upcoming_recitals: upcomingRecitals?.length || 0,
      pending_payments: 0, // TODO: Implement
      outstanding_costumes: outstandingCostumes,
      required_volunteer_hours: requiredVolunteerHours,
      completed_volunteer_hours: completedVolunteerHours,
    }

    return {
      guardian,
      students,
      stats,
      weeklySchedule,
      upcomingRecitals: upcomingRecitals || [],
    }
  } catch (error: any) {
    console.error('Error fetching parent dashboard:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch dashboard data',
    })
  }
})
