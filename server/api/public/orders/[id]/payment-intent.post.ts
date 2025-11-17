// server/api/public/orders/[id]/payment-intent.post.ts
/**
 * PUBLIC API - Create Payment Intent
 *
 * SECURITY: Requires customer_email verification to prevent unauthorized payment creation
 * Uses RLS-aware client for proper access control
 */

export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!orderId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Order ID is required'
    })
  }

  // SECURITY: Require email verification
  if (!body.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email is required for verification'
    })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid email format'
    })
  }

  try {
    // Use RLS-aware client
    const client = await serverSupabaseClient(event)

    // Get order details with email verification
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        total_amount_in_cents,
        status,
        stripe_payment_intent_id,
        show:recital_shows!ticket_orders_show_id_fkey (
          id,
          title
        )
      `)
      .eq('id', orderId)
      .eq('customer_email', body.email)
      .maybeSingle()

    if (orderError) {
      console.error('Order fetch error:', orderError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch order'
      })
    }

    // Order not found or email doesn't match
    if (!order) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order not found or email does not match'
      })
    }

    // Check if payment is already completed
    if (order.status === 'paid') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Order has already been paid'
      })
    }

    // If payment intent already exists, return it
    if (order.stripe_payment_intent_id) {
      const stripe = await getStripe()
      const existingIntent = await stripe.paymentIntents.retrieve(
        order.stripe_payment_intent_id
      )

      if (existingIntent.status !== 'canceled') {
        return {
          clientSecret: existingIntent.client_secret
        }
      }
    }

    // Create a new PaymentIntent
    const stripe = await getStripe()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.total_amount_in_cents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true
      },
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        show_title: order.show?.title || '',
        customer_email: order.customer_email
      }
    })

    // Update order with the payment intent ID (use service client for this)
    const serviceClient = getSupabaseClient()
    const { error: updateError } = await serviceClient
      .from('ticket_orders')
      .update({
        stripe_payment_intent_id: paymentIntent.id
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Failed to update order with payment intent:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update order'
      })
    }

    return {
      clientSecret: paymentIntent.client_secret
    }
  } catch (error: any) {
    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error
    }

    console.error('Create payment intent API error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create payment intent'
    })
  }
})