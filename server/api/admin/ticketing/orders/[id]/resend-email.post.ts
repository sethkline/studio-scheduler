// server/api/admin/ticketing/orders/[id]/resend-email.post.ts

import { logError } from '~/server/utils/logger'
import { logAudit, logAuditFailure, AuditActions, AuditResourceTypes } from '~/server/utils/audit'

/**
 * POST /api/admin/ticketing/orders/:id/resend-email
 * Resend order confirmation email
 * Requires: Admin or Staff role
 */
export default defineEventHandler(async (event) => {
  // Require admin or staff role
  await requireAdminOrStaff(event)

  const client = getSupabaseClient()
  const orderId = getRouterParam(event, 'id')

  if (!orderId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Order ID is required'
    })
  }

  // Verify order exists
  const { data: order, error: orderError } = await client
    .from('ticket_orders')
    .select('id, customer_email, customer_name, order_number')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Order not found'
    })
  }

  // Send confirmation email using existing utility
  try {
    const emailSent = await sendTicketConfirmationEmail(client, orderId, {
      includePdfAttachments: true
    })

    if (!emailSent) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to send confirmation email'
      })
    }

    // Log audit trail for email resend
    await logAudit(event, {
      action: AuditActions.TICKET_RESEND,
      resourceType: AuditResourceTypes.ORDER,
      resourceId: orderId,
      metadata: {
        order_number: order.order_number,
        customer_email: order.customer_email,
        customer_name: order.customer_name,
      },
      status: 'success',
    })

    return {
      success: true,
      message: `Confirmation email sent to ${order.customer_email}`
    }
  } catch (error: any) {
    logError(error, {
      context: 'resend_confirmation_email',
      order_id: orderId,
    })

    // Log audit trail for failed email resend
    await logAuditFailure(
      event,
      AuditActions.TICKET_RESEND,
      AuditResourceTypes.ORDER,
      error.message || 'Failed to resend confirmation email',
      orderId,
      {
        customer_email: order?.customer_email,
      }
    )

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send confirmation email',
      message: error.message
    })
  }
})
