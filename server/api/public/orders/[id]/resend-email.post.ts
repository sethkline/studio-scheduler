// server/api/public/orders/[id]/resend-email.post.ts
import { getSupabaseClient } from '../../../../utils/supabase'
import { sendTicketConfirmationEmail } from '../../../../utils/ticketEmail'

/**
 * Public API endpoint to resend confirmation email for an order
 * Allows customers to request a new confirmation email
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'Order ID is required'
      })
    }

    // Verify the order exists and is paid
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .select('id, customer_email, status')
      .eq('id', id)
      .single()

    if (orderError) {
      console.error('Error fetching order:', orderError)
      throw createError({
        statusCode: orderError.code === 'PGRST116' ? 404 : 500,
        message: orderError.code === 'PGRST116' ? 'Order not found' : 'Failed to fetch order'
      })
    }

    // Only allow resending for paid orders
    if (order.status !== 'paid') {
      throw createError({
        statusCode: 400,
        message: 'Cannot resend email for unpaid orders'
      })
    }

    // Send the confirmation email
    const emailSent = await sendTicketConfirmationEmail(client, id, {
      toEmail: order.customer_email,
      includePdfAttachments: true
    })

    if (!emailSent) {
      throw createError({
        statusCode: 500,
        message: 'Failed to send confirmation email'
      })
    }

    return {
      success: true,
      message: 'Confirmation email sent successfully',
      data: {
        orderId: id,
        sentTo: order.customer_email
      }
    }
  } catch (error: any) {
    console.error('Resend email API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to resend confirmation email'
    })
  }
})
