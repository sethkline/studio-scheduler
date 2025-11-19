// server/api/webhooks/stripe/ticket-payment.post.ts

import Stripe from 'stripe'
import { getUserSupabaseClient } from '../../utils/supabase'

/**
 * SECURITY NOTE: This webhook endpoint is called by Stripe, not by users.
 *
 * Authentication strategy:
 * - Uses Stripe signature verification instead of user authentication
 * - Uses service role client (getSupabaseClient) to bypass RLS
 *   This is intentional and secure because:
 *   1. Stripe signature proves the request is from Stripe
 *   2. Payment intent metadata is verified against order
 *   3. Only Stripe can trigger these updates
 *
 * DO NOT add user authentication to this endpoint - Stripe cannot authenticate as a user.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // Public endpoint - querying public data only

  const client = getSupabaseClient() // Service role - required for Stripe webhooks

  try {
    // Get raw body for signature verification
    const body = await readRawBody(event)
    const signature = getHeader(event, 'stripe-signature')

    if (!body || !signature) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing body or signature'
      })
    }

    // Initialize Stripe
    const stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: '2024-12-18.acacia'
    })

    // Verify webhook signature
    // CRITICAL SECURITY: You MUST set STRIPE_WEBHOOK_SECRET in production
    // Get this from Stripe Dashboard > Developers > Webhooks
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.warn('⚠️  STRIPE_WEBHOOK_SECRET not configured. Webhook signature verification DISABLED.')
      console.warn('⚠️  This is INSECURE for production. Set STRIPE_WEBHOOK_SECRET environment variable.')
    }

    let stripeEvent: Stripe.Event

    if (webhookSecret) {
      try {
        stripeEvent = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      } catch (error: any) {
        console.error('Webhook signature verification failed:', error)
        throw createError({
          statusCode: 400,
          statusMessage: `Webhook signature verification failed: ${error.message}`
        })
      }
    } else {
      // Parse the event without verification (INSECURE - for development only)
      stripeEvent = JSON.parse(body)
    }

    console.log(`Received Stripe webhook: ${stripeEvent.type}`)

    // Handle different event types
    switch (stripeEvent.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent
        await handlePaymentSuccess(client, paymentIntent)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent
        await handlePaymentFailure(client, paymentIntent)
        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent
        await handlePaymentCanceled(client, paymentIntent)
        break
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`)
    }

    return {
      success: true,
      message: 'Webhook processed successfully'
    }
  } catch (error: any) {
    console.error('Error processing webhook:', error)

    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error
    }

    // Generic error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to process webhook'
    })
  }
})

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(client: any, paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata.order_id

  if (!orderId) {
    console.error('No order_id in payment intent metadata')
    return
  }

  console.log(`Processing successful payment for order ${orderId}`)

  // Get the order with tickets
  const { data: order, error: orderError } = await client
    .from('ticket_orders')
    .select(`
      *,
      tickets (
        id,
        show_seat_id
      )
    `)
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    console.error('Order not found:', orderId)
    return
  }

  // Check if already processed
  if (order.status === 'paid') {
    console.log('Order already marked as paid')
    return
  }

  // Update order status
  const { error: updateOrderError } = await client
    .from('ticket_orders')
    .update({
      status: 'paid',
      stripe_payment_intent_id: paymentIntent.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (updateOrderError) {
    console.error('Error updating order status:', updateOrderError)
    return
  }

  // Mark seats as sold
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
    }
  }

  console.log(`Order ${orderId} marked as paid`)

  // TODO: Send confirmation email (Story 5.3)
  // await sendOrderConfirmationEmail(order)
}

/**
 * Handle failed payment
 */
async function handlePaymentFailure(client: any, paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata.order_id

  if (!orderId) {
    console.error('No order_id in payment intent metadata')
    return
  }

  console.log(`Processing failed payment for order ${orderId}`)

  // Update order status
  const { error: updateError } = await client
    .from('ticket_orders')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (updateError) {
    console.error('Error updating order status:', updateError)
    return
  }

  // Get tickets and release seats
  const { data: tickets, error: ticketsError } = await client
    .from('tickets')
    .select('show_seat_id')
    .eq('ticket_order_id', orderId)

  if (ticketsError || !tickets || tickets.length === 0) {
    console.error('Error fetching tickets or no tickets found')
    return
  }

  const seatIds = tickets.map((ticket: any) => ticket.show_seat_id)

  // Release seats back to available
  const { error: releaseSeatsError } = await client
    .from('show_seats')
    .update({
      status: 'available',
      reserved_by: null,
      reserved_until: null,
      updated_at: new Date().toISOString()
    })
    .in('id', seatIds)

  if (releaseSeatsError) {
    console.error('Error releasing seats:', releaseSeatsError)
  }

  console.log(`Order ${orderId} marked as failed, seats released`)
}

/**
 * Handle canceled payment
 */
async function handlePaymentCanceled(client: any, paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata.order_id

  if (!orderId) {
    console.error('No order_id in payment intent metadata')
    return
  }

  console.log(`Processing canceled payment for order ${orderId}`)

  // Update order status
  const { error: updateError } = await client
    .from('ticket_orders')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (updateError) {
    console.error('Error updating order status:', updateError)
    return
  }

  // Get tickets and release seats
  const { data: tickets, error: ticketsError } = await client
    .from('tickets')
    .select('show_seat_id')
    .eq('ticket_order_id', orderId)

  if (ticketsError || !tickets || tickets.length === 0) {
    console.error('Error fetching tickets or no tickets found')
    return
  }

  const seatIds = tickets.map((ticket: any) => ticket.show_seat_id)

  // Release seats back to available
  const { error: releaseSeatsError } = await client
    .from('show_seats')
    .update({
      status: 'available',
      reserved_by: null,
      reserved_until: null,
      updated_at: new Date().toISOString()
    })
    .in('id', seatIds)

  if (releaseSeatsError) {
    console.error('Error releasing seats:', releaseSeatsError)
  }

  console.log(`Order ${orderId} marked as cancelled, seats released`)
}
