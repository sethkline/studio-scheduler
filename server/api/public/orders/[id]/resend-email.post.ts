// server/api/public/orders/[id]/resend-email.post.ts
import { serverSupabaseClient } from '#supabase/server'
import { getUserSupabaseClient } from '../../../utils/supabase'
import { sendTicketConfirmationEmail } from '../../../../utils/ticketEmail'

/**
 * Public API endpoint to resend confirmation email for an order
 * Requires email verification to prevent unauthorized access
 * Uses RLS-aware client for security checks, service client for email operations
 */
export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'Order ID is required'
      })
    }

    // SECURITY: Require email verification to prevent unauthorized access
    const email = body.email as string
    if (!email) {
      throw createError({
        statusCode: 401,
        message: 'Email verification required. Please provide your email address.'
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

    // SECURITY: Verify email matches order owner
    if (order.customer_email.toLowerCase() !== email.toLowerCase()) {
      throw createError({
        statusCode: 403,
        message: 'Unauthorized. Email does not match order owner.'
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
    // NOTE: Use service client for email operations (PDF generation requires storage access)
    // This is safe because we already verified email ownership above
    const serviceClient = getSupabaseClient()
    const emailSent = await sendTicketConfirmationEmail(serviceClient, id, {
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
