/**
 * POST /api/billing/payments/create-intent
 * Create a Stripe payment intent for invoice payment
 */

import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // Use default Stripe API version (matches existing ticket payment system)
  const stripe = new Stripe(config.stripeSecretKey)

  const client = getSupabaseClient()
  const body = await readBody<{
    invoice_id: string
    amount?: number // Optional: for partial payments
    save_payment_method?: boolean
  }>(event)

  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  if (!body.invoice_id) {
    throw createError({
      statusCode: 400,
      message: 'Invoice ID is required',
    })
  }

  // Fetch invoice
  const { data: invoice, error: invoiceError } = await client
    .from('invoices')
    .select('*')
    .eq('id', body.invoice_id)
    .eq('parent_user_id', user.id)
    .single()

  if (invoiceError || !invoice) {
    throw createError({
      statusCode: 404,
      message: 'Invoice not found',
    })
  }

  // Determine payment amount
  const paymentAmount = body.amount || invoice.amount_due

  if (paymentAmount <= 0) {
    throw createError({
      statusCode: 400,
      message: 'Payment amount must be greater than zero',
    })
  }

  if (paymentAmount > invoice.amount_due) {
    throw createError({
      statusCode: 400,
      message: 'Payment amount cannot exceed amount due',
    })
  }

  // Get or create Stripe customer
  const { data: profile } = await client
    .from('profiles')
    .select('full_name, email, stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  let stripeCustomerId = profile?.stripe_customer_id

  if (!stripeCustomerId) {
    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: profile?.email || user.email,
      name: profile?.full_name,
      metadata: {
        user_id: user.id,
      },
    })

    stripeCustomerId = customer.id

    // Save customer ID
    await client
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('user_id', user.id)
  }

  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(paymentAmount * 100), // Convert to cents
    currency: 'usd',
    customer: stripeCustomerId,
    setup_future_usage: body.save_payment_method ? 'off_session' : undefined,
    metadata: {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      parent_user_id: user.id,
    },
  })

  return {
    success: true,
    data: {
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: paymentAmount,
    },
  }
})
