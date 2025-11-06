import Stripe from 'stripe'
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: '2024-06-20'
    })
    const client = getSupabaseClient()

    const body = await readBody(event)

    if (!body.paymentIntentId || !body.orderData) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing payment intent ID or order data'
      })
    }

    // Retrieve the payment intent to verify it was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(body.paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return createError({
        statusCode: 400,
        statusMessage: 'Payment not successful'
      })
    }

    // Update the order with payment information
    const { data: order, error: orderError } = await client
      .from('merchandise_orders')
      .update({
        payment_intent_id: paymentIntent.id,
        payment_status: 'completed',
        order_status: 'processing'
      })
      .eq('id', body.orderData.orderId)
      .select()
      .single()

    if (orderError) throw orderError

    // Convert reserved inventory to sold
    const { data: orderItems, error: itemsError } = await client
      .from('merchandise_order_items')
      .select('*')
      .eq('order_id', order.id)

    if (itemsError) throw itemsError

    // Update inventory: remove from reserved and on_hand
    for (const item of orderItems) {
      const { data: inventory, error: invError } = await client
        .from('merchandise_inventory')
        .select('*')
        .eq('variant_id', item.variant_id)
        .single()

      if (invError) continue

      await client
        .from('merchandise_inventory')
        .update({
          quantity_on_hand: inventory.quantity_on_hand - item.quantity,
          quantity_reserved: inventory.quantity_reserved - item.quantity
        })
        .eq('variant_id', item.variant_id)
    }

    return {
      success: true,
      order
    }
  } catch (error) {
    console.error('Confirm payment API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to confirm payment'
    })
  }
})
