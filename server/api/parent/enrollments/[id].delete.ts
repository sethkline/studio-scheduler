import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user
  const enrollmentId = event.context.params?.id

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  if (!enrollmentId) {
    throw createError({
      statusCode: 400,
      message: 'Enrollment ID is required',
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

    // Get enrollment to verify access
    const { data: enrollment, error: enrollmentError } = await client
      .from('enrollments')
      .select('student_id')
      .eq('id', enrollmentId)
      .single()

    if (enrollmentError || !enrollment) {
      throw createError({
        statusCode: 404,
        message: 'Enrollment not found',
      })
    }

    // Verify this guardian has access to this student
    const { data: relationship, error: relationshipError } = await client
      .from('student_guardian_relationships')
      .select('id')
      .eq('guardian_id', guardian.id)
      .eq('student_id', enrollment.student_id)
      .single()

    if (relationshipError || !relationship) {
      throw createError({
        statusCode: 403,
        message: 'Access denied: You do not have permission to unenroll this student',
      })
    }

    // Soft delete - change status to 'dropped' instead of deleting
    const { error: updateError } = await client
      .from('enrollments')
      .update({
        status: 'dropped',
        dropped_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId)

    if (updateError) throw updateError

    return {
      message: 'Student successfully unenrolled',
    }
  } catch (error: any) {
    console.error('Error deleting enrollment:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to unenroll student',
    })
  }
})
