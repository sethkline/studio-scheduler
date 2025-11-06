import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user
  const requestId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  if (!requestId) {
    throw createError({
      statusCode: 400,
      message: 'Enrollment request ID is required',
    })
  }

  const { action } = body // 'cancel' is the only action parents can take

  if (action !== 'cancel') {
    throw createError({
      statusCode: 400,
      message: 'Invalid action. Parents can only cancel enrollment requests.',
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

    // Get the enrollment request and verify ownership
    const { data: enrollmentRequest, error: requestError } = await client
      .from('enrollment_requests')
      .select(`
        id,
        guardian_id,
        status,
        student_id,
        class_instance_id,
        students (
          first_name,
          last_name
        ),
        class_instances (
          name
        )
      `)
      .eq('id', requestId)
      .single()

    if (requestError || !enrollmentRequest) {
      throw createError({
        statusCode: 404,
        message: 'Enrollment request not found',
      })
    }

    // Verify the guardian owns this request
    if (enrollmentRequest.guardian_id !== guardian.id) {
      throw createError({
        statusCode: 403,
        message: 'Access denied: You do not own this enrollment request',
      })
    }

    // Can only cancel pending or waitlist requests
    if (!['pending', 'waitlist'].includes(enrollmentRequest.status)) {
      throw createError({
        statusCode: 400,
        message: `Cannot cancel request with status: ${enrollmentRequest.status}`,
      })
    }

    // Update the request to cancelled
    const { data: updatedRequest, error: updateError } = await client
      .from('enrollment_requests')
      .update({
        status: 'cancelled',
        processed_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) throw updateError

    const student = enrollmentRequest.students as any
    const classInstance = enrollmentRequest.class_instances as any

    // Create notification (optional - system confirmation)
    await client.from('enrollment_notifications').insert({
      enrollment_request_id: requestId,
      guardian_id: guardian.id,
      notification_type: 'request_received', // Could add 'cancelled' type
      subject: 'Enrollment Request Cancelled',
      message: `Your enrollment request for ${student?.first_name} ${student?.last_name} in ${classInstance?.name} has been cancelled.`,
      metadata: {
        student_name: `${student?.first_name} ${student?.last_name}`,
        class_name: classInstance?.name,
        cancelled_at: new Date().toISOString(),
      },
    })

    return {
      message: 'Enrollment request cancelled successfully',
      enrollmentRequest: updatedRequest,
    }
  } catch (error: any) {
    console.error('Error cancelling enrollment request:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to cancel enrollment request',
    })
  }
})
