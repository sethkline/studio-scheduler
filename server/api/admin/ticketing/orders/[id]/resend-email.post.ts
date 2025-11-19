// server/api/admin/ticketing/orders/[id]/resend-email.post.ts

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

    return {
      success: true,
      message: `Confirmation email sent to ${order.customer_email}`
    }
  } catch (error: any) {
    console.error('Error sending confirmation email:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send confirmation email',
      message: error.message
    })
  }
})
