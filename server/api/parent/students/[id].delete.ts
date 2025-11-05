import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user
  const studentId = event.context.params?.id

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
        message: 'Access denied: You do not have permission to delete this student',
      })
    }

    // Check if student has active enrollments
    const { count: enrollmentCount } = await client
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('status', 'active')

    if (enrollmentCount && enrollmentCount > 0) {
      throw createError({
        statusCode: 400,
        message: 'Cannot delete student with active class enrollments. Please unenroll from all classes first.',
      })
    }

    // Soft delete - set status to inactive instead of actually deleting
    const { error: updateError } = await client
      .from('students')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)

    if (updateError) throw updateError

    return {
      message: 'Student deactivated successfully',
    }
  } catch (error: any) {
    console.error('Error deleting student:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to delete student',
    })
  }
})
