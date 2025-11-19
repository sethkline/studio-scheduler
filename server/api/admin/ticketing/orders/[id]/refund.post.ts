// server/api/admin/ticketing/orders/[id]/refund.post.ts

import type { TicketOrder } from '~/types'
import { emailService } from '~/server/utils/email'

/**
 * POST /api/admin/ticketing/orders/:id/refund
 * Process a refund for an order
 * Requires: Admin role only
 */
export default defineEventHandler(async (event) => {
  // Require admin role
  await requireAdmin(event)

  const client = getSupabaseClient()
  const orderId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!orderId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Order ID is required'
    })
  }

  // Validate refund amount
  const { amount_in_cents, reason } = body

  if (!amount_in_cents || amount_in_cents <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid refund amount is required'
    })
  }

  // Fetch the order
  const { data: order, error: orderError } = await client
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
        show_seat_id,
        show_seat:show_seats (
          id,
          seat_id,
          status
        )
      )
    `
    )
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Order not found'
    })
  }

  // Verify order status
  if (order.status === 'refunded') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Order has already been refunded'
    })
  }

  if (order.status !== 'paid') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only paid orders can be refunded'
    })
  }

  // Verify refund amount doesn't exceed order total
  if (amount_in_cents > order.total_amount_in_cents) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Refund amount cannot exceed order total'
    })
  }

  // Check if there's a Stripe payment intent
  if (!order.stripe_payment_intent_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No payment intent found for this order'
    })
  }

  const isFullRefund = amount_in_cents === order.total_amount_in_cents

  try {
    // Process refund through Stripe
    const stripe = getStripeClient()
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: amount_in_cents,
      reason: reason || 'requested_by_customer',
      metadata: {
        order_id: orderId,
        order_number: order.order_number,
        refund_type: isFullRefund ? 'full' : 'partial'
      }
    })

    if (refund.status !== 'succeeded') {
      throw createError({
        statusCode: 500,
        statusMessage: 'Refund processing failed'
      })
    }

    // Update order status
    const newStatus: TicketOrder['status'] = isFullRefund ? 'refunded' : 'paid'
    const { error: updateError } = await client
      .from('ticket_orders')
      .update({
        status: newStatus,
        notes: order.notes
          ? `${order.notes}\n\nRefund processed: $${(amount_in_cents / 100).toFixed(2)} on ${new Date().toISOString()}. Reason: ${reason || 'N/A'}`
          : `Refund processed: $${(amount_in_cents / 100).toFixed(2)} on ${new Date().toISOString()}. Reason: ${reason || 'N/A'}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Failed to update order status:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update order status'
      })
    }

    // If full refund, release seats back to available
    if (isFullRefund && order.tickets && order.tickets.length > 0) {
      const showSeatIds = order.tickets
        .map((ticket: any) => ticket.show_seat_id)
        .filter(Boolean)

      if (showSeatIds.length > 0) {
        const { error: seatError } = await client
          .from('show_seats')
          .update({
            status: 'available',
            reserved_by: null,
            reserved_until: null
          })
          .in('id', showSeatIds)

        if (seatError) {
          console.error('Failed to release seats:', seatError)
          // Don't fail the refund if seat release fails, just log it
        }
      }
    }

    // Send refund confirmation email
    try {
      const showData = order.show as any
      await emailService.sendRefundConfirmation(
        order.customer_email,
        order.customer_name,
        order.order_number,
        amount_in_cents,
        isFullRefund,
        showData?.title || 'Event',
        showData?.show_date || '',
        showData?.show_time || '',
        showData?.venue?.name || 'Venue'
      )
    } catch (emailError) {
      console.error('Failed to send refund confirmation email:', emailError)
      // Don't fail the refund if email fails
    }

    // Fetch updated order
    const { data: updatedOrder, error: fetchError } = await client
      .from('ticket_orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchError) {
      console.error('Failed to fetch updated order:', fetchError)
    }

    return {
      success: true,
      message: isFullRefund
        ? 'Full refund processed successfully'
        : 'Partial refund processed successfully',
      data: {
        order: updatedOrder || order,
        refund: {
          id: refund.id,
          amount: refund.amount,
          status: refund.status,
          created: refund.created
        },
        seats_released: isFullRefund
      }
    }
  } catch (error: any) {
    console.error('Refund processing error:', error)

    // Handle Stripe errors
    if (error.type === 'StripeCardError') {
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to process refund'
    })
  }
})
