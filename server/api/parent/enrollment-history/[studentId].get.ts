import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user
  const studentId = getRouterParam(event, 'studentId')

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  if (!studentId) {
    throw createError({
      statusCode: 400,
      message: 'Student ID is required',
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

    // Verify this guardian has access to this student
    const { data: relationship, error: relationshipError } = await client
      .from('student_guardian_relationships')
      .select('id')
      .eq('guardian_id', guardian.id)
      .eq('student_id', studentId)
      .single()

    if (relationshipError || !relationship) {
      throw createError({
        statusCode: 403,
        message: 'Access denied: You do not have permission to view this student\'s enrollment history',
      })
    }

    // Get enrollment history for this student
    const { data: enrollmentHistory, error: historyError } = await client
      .from('enrollment_history')
      .select(`
        id,
        enrollment_id,
        enrollment_request_id,
        student_id,
        class_instance_id,
        action,
        previous_status,
        new_status,
        performed_by,
        performed_by_role,
        notes,
        metadata,
        created_at,
        class_instances (
          id,
          name,
          class_definitions (
            id,
            name,
            dance_styles (
              name,
              color
            ),
            class_levels (
              name
            )
          ),
          teachers (
            first_name,
            last_name
          )
        ),
        profiles (
          first_name,
          last_name,
          user_role
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    if (historyError) throw historyError

    // Format the response
    const formattedHistory = (enrollmentHistory || []).map(item => {
      const classInstance = item.class_instances as any
      const classDef = classInstance?.class_definitions
      const teacher = classInstance?.teachers
      const performedByProfile = item.profiles as any

      return {
        id: item.id,
        enrollmentId: item.enrollment_id,
        enrollmentRequestId: item.enrollment_request_id,
        action: item.action,
        previousStatus: item.previous_status,
        newStatus: item.new_status,
        performedByRole: item.performed_by_role,
        notes: item.notes,
        metadata: item.metadata,
        createdAt: item.created_at,
        class: {
          id: classInstance?.id,
          name: classInstance?.name || classDef?.name,
          danceStyle: classDef?.dance_styles?.name,
          danceStyleColor: classDef?.dance_styles?.color,
          level: classDef?.class_levels?.name,
          teacher: teacher ? {
            firstName: teacher.first_name,
            lastName: teacher.last_name,
            fullName: `${teacher.first_name} ${teacher.last_name}`,
          } : null,
        },
        performedBy: performedByProfile ? {
          firstName: performedByProfile.first_name,
          lastName: performedByProfile.last_name,
          fullName: `${performedByProfile.first_name} ${performedByProfile.last_name}`,
          role: performedByProfile.user_role,
        } : null,
      }
    })

    return {
      enrollmentHistory: formattedHistory,
      total: formattedHistory.length,
    }
  } catch (error: any) {
    console.error('Error fetching enrollment history:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch enrollment history',
    })
  }
})
