import { getSupabaseClient } from '../../../utils/supabase'

/**
 * Approve or Deny Enrollment Request (Staff/Admin)
 *
 * Uses atomic database functions to ensure transaction safety and concurrency control.
 * - approve_enrollment_request(): Locks request, checks capacity, creates enrollment or waitlists
 * - deny_enrollment_request(): Atomically denies request with reason
 */
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

  const { action, admin_notes, denial_reason } = body

  if (!action || !['approve', 'deny'].includes(action)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid action. Must be "approve" or "deny".',
    })
  }

  try {
    // Verify user has staff or admin role
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('user_role, first_name, last_name')
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

    if (action === 'deny') {
      // Validate denial reason is provided
      if (!denial_reason || denial_reason.trim() === '') {
        throw createError({
          statusCode: 400,
          message: 'Denial reason is required',
        })
      }

      // Use atomic database function for denial
      // Handles locking, validation, and notification creation in single transaction
      const { data: result, error: denyError } = await client.rpc('deny_enrollment_request', {
        p_request_id: requestId,
        p_denier_id: user.id,
        p_denial_reason: denial_reason,
        p_admin_notes: admin_notes,
      })

      if (denyError) {
        console.error('Error denying enrollment request:', denyError)
        throw createError({
          statusCode: 500,
          message: denyError.message || 'Failed to deny enrollment request',
        })
      }

      return {
        success: true,
        message: 'Enrollment request denied',
        result,
      }
    }

    // Action is 'approve'
    // Use atomic database function for approval
    // Handles: locking, capacity check, enrollment creation or waitlist, notification
    // All in single transaction with concurrency safety
    const { data: result, error: approveError } = await client.rpc('approve_enrollment_request', {
      p_request_id: requestId,
      p_approver_id: user.id,
      p_admin_notes: admin_notes,
    })

    if (approveError) {
      console.error('Error approving enrollment request:', approveError)
      throw createError({
        statusCode: 500,
        message: approveError.message || 'Failed to approve enrollment request',
      })
    }

    // Extract result details
    const resultData = result as any

    if (resultData.action === 'waitlisted') {
      return {
        success: true,
        message: 'Class is full. Request approved and student added to waitlist.',
        waitlisted: true,
        waitlistPosition: resultData.waitlist_position,
        result: resultData,
      }
    }

    return {
      success: true,
      message: 'Enrollment request approved and student enrolled successfully',
      waitlisted: false,
      enrollmentId: resultData.enrollment_id,
      result: resultData,
    }
  } catch (error: any) {
    console.error('Error processing enrollment request:', error)

    // Re-throw createError errors directly
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to process enrollment request',
    })
  }
})
