// server/api/public/orders/[id]/payment-intent.post.ts
import { getSupabaseClient } from '../../../../utils/supabase'
import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    
    // Get order details
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .select(`
        id,
        customer_name,
        email,
        total_amount_in_cents,
        payment_status,
        show:recital_show_id (
          id,
          name
        )
      `)
      .eq('id', id)
      .single()
    
    if (orderError) throw orderError
    
    // Check if payment is already completed
    if (order.payment_status === 'completed') {
      return createError({
        statusCode: 400,
        statusMessage: 'Order has already been paid'
      })
    }
    
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.total_amount_in_cents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        order_id: order.id,
        show_name: order.show.name,
        customer_email: order.email
      }
    })
    
    // Update order with the payment intent ID
    const { error: updateError } = await client
      .from('ticket_orders')
      .update({
        payment_intent_id: paymentIntent.id
      })
      .eq('id', id)
    
    if (updateError) throw updateError
    
    return {
      clientSecret: paymentIntent.client_secret
    }
  } catch (error) {
    console.error('Create payment intent API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create payment intent'
    })
  }
})