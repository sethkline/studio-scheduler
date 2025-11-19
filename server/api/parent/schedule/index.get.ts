import { requireAuth, requireRole } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

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
      .select('id')
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
      .select('student_id')
      .eq('guardian_id', guardian.id)

    if (relationshipsError) throw relationshipsError

    const studentIds = relationships?.map((rel: any) => rel.student_id) || []

    if (studentIds.length === 0) {
      return {
        schedule: [],
        students: [],
      }
    }

    // Get all active enrollments for these students with class details
    const { data: enrollments, error: enrollmentsError } = await client
      .from('enrollments')
      .select(`
        *,
        student:students(id, first_name, last_name),
        class_instance:class_instances(
          id,
          name,
          schedule_classes(
            id,
            day_of_week,
            start_time,
            end_time,
            studio_room:studio_rooms(name, location)
          ),
          class_definition:class_definitions(
            name,
            dance_style:dance_styles(name, color)
          ),
          teacher:profiles(id, first_name, last_name)
        )
      `)
      .in('student_id', studentIds)
      .eq('status', 'active')

    if (enrollmentsError) throw enrollmentsError

    // Transform into schedule events
    const schedule = enrollments
      ?.filter((enrollment: any) => enrollment.class_instance)
      .flatMap((enrollment: any) => {
        const classInstance = enrollment.class_instance
        const scheduleClasses = classInstance.schedule_classes || []

        return scheduleClasses.map((sc: any) => ({
          id: `${enrollment.id}-${sc.id}`,
          enrollment_id: enrollment.id,
          student_id: enrollment.student.id,
          student_name: `${enrollment.student.first_name} ${enrollment.student.last_name}`,
          class_name: classInstance.class_definition?.name || classInstance.name,
          class_instance_id: classInstance.id,
          day_of_week: sc.day_of_week,
          start_time: sc.start_time,
          end_time: sc.end_time,
          location: sc.studio_room?.name,
          teacher_id: classInstance.teacher?.id,
          teacher_name: classInstance.teacher
            ? `${classInstance.teacher.first_name} ${classInstance.teacher.last_name}`
            : null,
          dance_style: classInstance.class_definition?.dance_style?.name,
          dance_style_color: classInstance.class_definition?.dance_style?.color || '#cccccc',
        }))
      }) || []

    // Get student list for filtering
    const { data: students, error: studentsError } = await client
      .from('students')
      .select('id, first_name, last_name')
      .in('id', studentIds)
      .eq('status', 'active')

    if (studentsError) throw studentsError

    return {
      schedule,
      students: students || [],
    }
  } catch (error: any) {
    console.error('Error fetching parent schedule:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch schedule',
    })
  }
})
