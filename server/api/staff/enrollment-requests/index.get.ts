import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user
  const query = getQuery(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  try {
    // Verify user has staff or admin role
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw createError({
        statusCode: 404,
        message: 'User profile not found',
      })
    }

    if (!['admin', 'staff'].includes(profile.user_role)) {
      throw createError({
        statusCode: 403,
        message: 'Access denied: Staff or admin role required',
      })
    }

    // Build query with optional filters
    let dbQuery = client
      .from('enrollment_requests')
      .select(`
        id,
        student_id,
        class_instance_id,
        guardian_id,
        status,
        requested_at,
        processed_at,
        processed_by,
        has_schedule_conflict,
        conflict_details,
        notes,
        admin_notes,
        denial_reason,
        students (
          id,
          first_name,
          last_name,
          date_of_birth
        ),
        guardians (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        class_instances (
          id,
          name,
          status,
          class_definitions (
            id,
            name,
            description,
            duration,
            max_students,
            min_age,
            max_age,
            dance_styles (
              id,
              name,
              color
            ),
            class_levels (
              id,
              name
            )
          ),
          teachers (
            id,
            first_name,
            last_name,
            email
          ),
          schedule_classes (
            id,
            day_of_week,
            start_time,
            end_time,
            studio_rooms (
              id,
              name
            )
          )
        ),
        processed_by_profile:profiles!processed_by (
          id,
          first_name,
          last_name,
          user_role
        )
      `)

    // Filter by status if provided
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status as string)
    }

    // Filter by class if provided
    if (query.class_instance_id) {
      dbQuery = dbQuery.eq('class_instance_id', query.class_instance_id as string)
    }

    // Order by requested date (newest first)
    dbQuery = dbQuery.order('requested_at', { ascending: false })

    const { data: enrollmentRequests, error: requestsError } = await dbQuery

    if (requestsError) throw requestsError

    // Get current enrollment counts for each class
    const classIds = [...new Set((enrollmentRequests || []).map(r => r.class_instance_id))]
    const enrollmentCounts: Record<string, number> = {}

    for (const classId of classIds) {
      const { count } = await client
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('class_instance_id', classId)
        .eq('status', 'active')

      enrollmentCounts[classId] = count || 0
    }

    // Format the response
    const formattedRequests = (enrollmentRequests || []).map(request => {
      const student = request.students as any
      const guardian = request.guardians as any
      const classInstance = request.class_instances as any
      const classDef = classInstance?.class_definitions
      const teacher = classInstance?.teachers
      const scheduleClasses = classInstance?.schedule_classes || []
      const processedBy = request.processed_by_profile as any

      const currentEnrollmentCount = enrollmentCounts[request.class_instance_id] || 0
      const maxStudents = classDef?.max_students || 0
      const isFull = maxStudents > 0 && currentEnrollmentCount >= maxStudents
      const availableSpots = maxStudents > 0 ? Math.max(0, maxStudents - currentEnrollmentCount) : Infinity

      return {
        id: request.id,
        status: request.status,
        requestedAt: request.requested_at,
        processedAt: request.processed_at,
        hasScheduleConflict: request.has_schedule_conflict,
        conflictDetails: request.conflict_details,
        notes: request.notes,
        adminNotes: request.admin_notes,
        denialReason: request.denial_reason,
        student: {
          id: student?.id,
          firstName: student?.first_name,
          lastName: student?.last_name,
          fullName: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
          dateOfBirth: student?.date_of_birth,
          age: student?.date_of_birth
            ? Math.floor(
                (new Date().getTime() - new Date(student.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
              )
            : null,
        },
        guardian: {
          id: guardian?.id,
          firstName: guardian?.first_name,
          lastName: guardian?.last_name,
          fullName: guardian ? `${guardian.first_name} ${guardian.last_name}` : 'Unknown',
          email: guardian?.email,
          phone: guardian?.phone,
        },
        class: {
          id: classInstance?.id,
          name: classInstance?.name || classDef?.name,
          description: classDef?.description,
          duration: classDef?.duration,
          maxStudents: classDef?.max_students,
          currentEnrollments: currentEnrollmentCount,
          availableSpots,
          isFull,
          minAge: classDef?.min_age,
          maxAge: classDef?.max_age,
          status: classInstance?.status,
          danceStyle: {
            id: classDef?.dance_styles?.id,
            name: classDef?.dance_styles?.name,
            color: classDef?.dance_styles?.color,
          },
          level: {
            id: classDef?.class_levels?.id,
            name: classDef?.class_levels?.name,
          },
          teacher: teacher ? {
            id: teacher.id,
            firstName: teacher.first_name,
            lastName: teacher.last_name,
            fullName: `${teacher.first_name} ${teacher.last_name}`,
            email: teacher.email,
          } : null,
          schedule: scheduleClasses.map((sc: any) => ({
            id: sc.id,
            dayOfWeek: sc.day_of_week,
            startTime: sc.start_time,
            endTime: sc.end_time,
            room: sc.studio_rooms ? {
              id: sc.studio_rooms.id,
              name: sc.studio_rooms.name,
            } : null,
          })),
        },
        processedBy: processedBy ? {
          id: processedBy.id,
          firstName: processedBy.first_name,
          lastName: processedBy.last_name,
          fullName: `${processedBy.first_name} ${processedBy.last_name}`,
          role: processedBy.user_role,
        } : null,
      }
    })

    // Group by status for summary
    const summary = {
      total: formattedRequests.length,
      pending: formattedRequests.filter(r => r.status === 'pending').length,
      approved: formattedRequests.filter(r => r.status === 'approved').length,
      denied: formattedRequests.filter(r => r.status === 'denied').length,
      waitlist: formattedRequests.filter(r => r.status === 'waitlist').length,
      cancelled: formattedRequests.filter(r => r.status === 'cancelled').length,
    }

    return {
      enrollmentRequests: formattedRequests,
      summary,
    }
  } catch (error: any) {
    console.error('Error fetching enrollment requests:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch enrollment requests',
    })
  }
})
