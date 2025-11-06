import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: '2024-06-20'
    })

    const body = await readBody(event)

    if (!body.amount || body.amount <= 0) {
      return createError({
        statusCode: 400,
        statusMessage: 'Invalid amount'
      })
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: body.amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true
      },
      metadata: {
        order_type: 'merchandise',
        customer_email: body.orderData?.email || '',
        customer_name: body.orderData?.customer_name || ''
      }
    })

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    }
  } catch (error) {
    console.error('Create payment intent API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create payment intent'
    })
  }
})
