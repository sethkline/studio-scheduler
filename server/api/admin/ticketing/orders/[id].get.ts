// server/api/admin/ticketing/orders/[id].get.ts

import type { OrderDetails } from '~/types'

/**
 * GET /api/admin/ticketing/orders/:id
 * Get detailed information about a specific order
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

  // Fetch order with all related data
  const { data: order, error } = await client
    .from('ticket_orders')
    .select(
      `
      *,
      show:recital_shows!ticket_orders_show_id_fkey (
        id,
        title,
        show_date,
        show_time,
        venue:venues (
          id,
          name
        )
      ),
      tickets (
        id,
        ticket_number,
        qr_code,
        pdf_url,
        pdf_generated_at,
        scanned_at,
        scanned_by,
        created_at,
        show_seat:show_seats (
          id,
          status,
          price_in_cents,
          seat:seats (
            id,
            row_name,
            seat_number,
            seat_type,
            section:venue_sections (
              id,
              name
            ),
            price_zone:price_zones (
              id,
              name,
              color
            )
          )
        )
      ),
      order_items:ticket_order_items (
        id,
        item_type,
        item_name,
        quantity,
        price_in_cents,
        ticket_id,
        created_at
      )
    `
    )
    .eq('id', orderId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order not found'
      })
    }

    throw createError({
      statusCode: 400,
      statusMessage: 'Failed to fetch order',
      message: error.message
    })
  }

  if (!order) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Order not found'
    })
  }

  // Get payment intent status from Stripe if available
  let paymentIntentStatus = undefined
  if (order.stripe_payment_intent_id) {
    try {
      const stripe = await getStripe()
      const paymentIntent = await stripe.paymentIntents.retrieve(
        order.stripe_payment_intent_id
      )
      paymentIntentStatus = paymentIntent.status
    } catch (stripeError) {
      // Log error but don't fail the request
      console.error('Failed to fetch Stripe payment intent:', stripeError)
    }
  }

  // Transform show data
  const showData = order.show as any
  const orderDetails: OrderDetails = {
    ...order,
    show: {
      id: showData.id,
      title: showData.title,
      show_date: showData.show_date,
      show_time: showData.show_time,
      venue_name: showData.venue?.name || 'Unknown Venue'
    },
    tickets: order.tickets || [],
    order_items: order.order_items || [],
    payment_status: mapOrderStatusToPaymentStatus(order.status),
    payment_intent_status: paymentIntentStatus
  }

  return { data: orderDetails }
})

/**
 * Map order status to payment status
 */
function mapOrderStatusToPaymentStatus(
  status: string
): 'pending' | 'succeeded' | 'failed' | 'refunded' {
  switch (status) {
    case 'paid':
      return 'succeeded'
    case 'failed':
      return 'failed'
    case 'refunded':
      return 'refunded'
    case 'pending':
    case 'cancelled':
    default:
      return 'pending'
  }
}
