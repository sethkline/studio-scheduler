// server/api/ticket-orders/confirm.post.ts

import Stripe from 'stripe'
import type { ConfirmPaymentRequest, ConfirmPaymentResponse } from '~/types/ticketing'
import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event): Promise<ConfirmPaymentResponse> => {
  const config = useRuntimeConfig()
  const client = getSupabaseClient()

  try {
    // Read request body
    const body = await readBody<ConfirmPaymentRequest>(event)
    const { order_id, payment_intent_id } = body

    if (!order_id || !payment_intent_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: order_id, payment_intent_id'
      })
    }

    // Step 1: Get the ticket order with tickets
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .select(`
        *,
        tickets (
          id,
          show_seat_id,
          qr_code,
          ticket_number
        )
      `)
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order not found'
      })
    }

    // Check if order is already paid
    if (order.status === 'paid') {
      // Already processed, return success
      return {
        success: true,
        message: 'Order already confirmed',
        order,
        tickets: order.tickets || []
      }
    }

    // Step 2: Verify payment intent with Stripe
    const stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: '2024-12-18.acacia'
    })

    let paymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)
    } catch (error: any) {
      console.error('Error retrieving payment intent:', error)
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid payment intent'
      })
    }

    // Check if payment succeeded
    if (paymentIntent.status !== 'succeeded') {
      throw createError({
        statusCode: 400,
        statusMessage: `Payment not completed. Status: ${paymentIntent.status}`
      })
    }

    // Verify payment intent belongs to this order
    if (paymentIntent.metadata.order_id !== order_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment intent does not match order'
      })
    }

    // Step 3: Update order status to paid
    const { error: updateOrderError } = await client
      .from('ticket_orders')
      .update({
        status: 'paid',
        stripe_payment_intent_id: payment_intent_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id)

    if (updateOrderError) {
      console.error('Error updating order status:', updateOrderError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update order status'
      })
    }

    // Step 4: Mark all seats as sold
    const seatIds = order.tickets?.map((ticket: any) => ticket.show_seat_id) || []

    if (seatIds.length > 0) {
      const { error: updateSeatsError } = await client
        .from('show_seats')
        .update({
          status: 'sold',
          reserved_by: null,
          reserved_until: null,
          updated_at: new Date().toISOString()
        })
        .in('id', seatIds)

      if (updateSeatsError) {
        console.error('Error marking seats as sold:', updateSeatsError)
        // Not critical, continue
      }
    }

    // Step 5: Release the reservation
    const { error: releaseReservationError } = await client
      .from('seat_reservations')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('recital_show_id', order.show_id)
      .eq('is_active', true)
      .in(
        'id',
        client
          .from('reservation_seats')
          .select('reservation_id')
          .in('show_seat_id', seatIds)
      )

    if (releaseReservationError) {
      console.error('Error releasing reservation:', releaseReservationError)
      // Not critical, continue
    }

    // Step 6: Send confirmation email (Story 5.3 - not implemented yet)
    // TODO: Implement email sending in Story 5.3
    // await sendOrderConfirmationEmail(order)

    return {
      success: true,
      message: 'Payment confirmed successfully',
      order: {
        ...order,
        status: 'paid',
        stripe_payment_intent_id: payment_intent_id
      },
      tickets: order.tickets || []
    }
  } catch (error: any) {
    console.error('Error confirming payment:', error)

    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error
    }

    // Generic error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to confirm payment'
    })
  }
})
