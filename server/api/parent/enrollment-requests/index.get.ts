import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
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

    // Get all enrollment requests for this guardian's students
    const { data: enrollmentRequests, error: requestsError } = await client
      .from('enrollment_requests')
      .select(`
        id,
        student_id,
        class_instance_id,
        status,
        requested_at,
        processed_at,
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
        )
      `)
      .eq('guardian_id', guardian.id)
      .order('requested_at', { ascending: false })

    if (requestsError) throw requestsError

    // Format the response
    const formattedRequests = (enrollmentRequests || []).map(request => {
      const student = request.students as any
      const classInstance = request.class_instances as any
      const classDef = classInstance?.class_definitions
      const teacher = classInstance?.teachers
      const scheduleClasses = classInstance?.schedule_classes || []

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
        },
        class: {
          id: classInstance?.id,
          name: classInstance?.name || classDef?.name,
          description: classDef?.description,
          duration: classDef?.duration,
          maxStudents: classDef?.max_students,
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
      }
    })

    return {
      enrollmentRequests: formattedRequests,
      total: formattedRequests.length,
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
