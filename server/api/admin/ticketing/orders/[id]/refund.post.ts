// server/api/admin/ticketing/orders/[id]/refund.post.ts

import type { TicketOrder } from '~/types'
import { emailService } from '~/server/utils/email'
import { logError, logWarning, logInfo } from '~/server/utils/logger'
import { logAudit, logAuditFailure, AuditActions, AuditResourceTypes } from '~/server/utils/audit'

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
      logError(new Error('Failed to update order status'), {
        context: 'order_refund_update',
        order_id: orderId,
        error: updateError,
      })
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
          logWarning('Failed to release seats after refund', {
            context: 'seat_release',
            order_id: orderId,
            show_seat_ids: showSeatIds,
            error: seatError,
          })
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
      logWarning('Failed to send refund confirmation email', {
        context: 'refund_email',
        order_id: orderId,
        customer_email: order.customer_email,
        error: emailError,
      })
      // Don't fail the refund if email fails
    }

    // Fetch updated order
    const { data: updatedOrder, error: fetchError } = await client
      .from('ticket_orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchError) {
      logWarning('Failed to fetch updated order after refund', {
        context: 'order_fetch',
        order_id: orderId,
        error: fetchError,
      })
    }

    // Log audit trail for refund
    await logAudit(event, {
      action: AuditActions.ORDER_REFUND,
      resourceType: AuditResourceTypes.ORDER,
      resourceId: orderId,
      metadata: {
        order_number: order.order_number,
        amount_in_cents,
        refund_type: isFullRefund ? 'full' : 'partial',
        reason,
        stripe_refund_id: refund.id,
        customer_email: order.customer_email,
        seats_released: isFullRefund,
      },
      status: 'success',
    })

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
    logError(error, {
      context: 'refund_processing',
      order_id: orderId,
      amount_in_cents,
      is_full_refund: isFullRefund,
    })

    // Log audit trail for failed refund
    await logAuditFailure(
      event,
      AuditActions.ORDER_REFUND,
      AuditResourceTypes.ORDER,
      error.message || 'Refund processing failed',
      orderId,
      {
        amount_in_cents,
        refund_type: isFullRefund ? 'full' : 'partial',
        reason,
        error_type: error.type || 'unknown',
      }
    )

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
