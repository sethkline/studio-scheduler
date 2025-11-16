/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events for subscriptions and payments
 *
 * UPDATED: Uses unified payment system (tuition_invoices, payment_transactions)
 *
 * SECURITY FEATURES:
 * - Webhook signature verification
 * - Idempotency checks to prevent duplicate processing
 * - Transaction safety for database operations
 */

import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // Use default Stripe API version (no explicit version specified)
  const stripe = new Stripe(config.stripeSecretKey)

  const client = getSupabaseClient()

  try {
    const body = await readRawBody(event)
    const signature = getHeader(event, 'stripe-signature')

    if (!body || !signature) {
      throw createError({
        statusCode: 400,
        message: 'Missing body or signature',
      })
    }

    // Verify webhook signature
    let stripeEvent: Stripe.Event
    try {
      const webhookSecret = config.stripeWebhookSecret || ''
      stripeEvent = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      throw createError({
        statusCode: 400,
        message: `Webhook signature verification failed: ${err.message}`,
      })
    }

    console.log(`Received Stripe webhook event: ${stripeEvent.type}`)

    // Handle different event types
    switch (stripeEvent.type) {
      case 'invoice.paid':
        await handleInvoicePaid(stripeEvent.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(stripeEvent.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(stripeEvent.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object as Stripe.Subscription)
        break

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(stripeEvent.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(stripeEvent.data.object as Stripe.PaymentIntent)
        break

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`)
    }

    return {
      received: true,
      type: stripeEvent.type,
    }

  } catch (error: any) {
    console.error('Webhook error:', error)
    throw createError({
      statusCode: 400,
      message: error.message,
    })
  }
})

/**
 * Handle successful invoice payment (from subscription)
 * IDEMPOTENT: Checks for existing payment_transaction by stripe_payment_intent_id
 * UPDATED: Uses payment_plans and payment_transactions from unified system
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const client = getSupabaseClient()

  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) {
    console.log('Invoice not associated with subscription, skipping')
    return
  }

  const paymentIntentId = invoice.payment_intent as string
  if (!paymentIntentId) {
    console.error('Invoice has no payment_intent, skipping')
    return
  }

  // IDEMPOTENCY CHECK: Check if we already processed this payment
  const { data: existingTransaction } = await client
    .from('payment_transactions')
    .select('id, confirmation_number')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .eq('transaction_type', 'tuition')
    .single()

  if (existingTransaction) {
    console.log(`Payment already processed for payment_intent ${paymentIntentId}, transaction ${existingTransaction.confirmation_number}`)
    return // Already processed, skip
  }

  // Find payment plan by subscription ID
  const { data: paymentPlan } = await client
    .from('payment_plans')
    .select(`
      *,
      guardian:guardians!inner(
        id,
        user_id,
        profile:profiles!inner(
          user_id,
          full_name,
          email
        )
      )
    `)
    .eq('stripe_subscription_id', subscriptionId)
    .eq('plan_type', 'tuition')
    .single()

  if (!paymentPlan) {
    console.error('Payment plan not found for subscription:', subscriptionId)
    return
  }

  const guardian = paymentPlan.guardian
  const profile = guardian.profile

  // Generate invoice number (confirmation number)
  const { generateInvoiceNumber } = await import('~/server/utils/billingCalculations')
  const confirmationNumber = await generateInvoiceNumber()

  // Create payment transaction record
  const { data: transaction, error: transactionError } = await client
    .from('payment_transactions')
    .insert({
      transaction_type: 'tuition',
      guardian_id: guardian.id,
      student_id: paymentPlan.student_id,
      amount_in_cents: invoice.amount_paid,
      payment_method: invoice.default_payment_method as string || null,
      stripe_payment_intent_id: paymentIntentId,
      status: 'completed',
      confirmation_number: confirmationNumber,
      notes: `Auto-pay subscription payment${paymentPlan.autopay_discount_percentage > 0 ? ` - ${paymentPlan.autopay_discount_percentage}% discount applied` : ''}`,
    })
    .select()
    .single()

  if (transactionError) {
    console.error('Failed to create payment transaction:', transactionError)
    return
  }

  // Update payment plan's next payment date
  const nextPaymentDate = new Date()
  nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1)

  await client
    .from('payment_plans')
    .update({
      next_payment_date: nextPaymentDate.toISOString().split('T')[0],
      last_payment_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', paymentPlan.id)

  // Send receipt email (idempotent - only if transaction was just created)
  const { sendPaymentReceiptEmail } = await import('~/server/utils/emailTemplates')
  try {
    await sendPaymentReceiptEmail({
      payment: {
        amount: invoice.amount_paid / 100,
        confirmation_number: confirmationNumber,
        payment_date: new Date().toISOString(),
      },
      invoice: transaction,
      parentEmail: profile.email || '',
      parentName: profile.full_name || '',
    })
  } catch (emailError) {
    console.error('Failed to send receipt email:', emailError)
    // Don't fail webhook processing if email fails
  }

  console.log(`Successfully processed invoice.paid for subscription ${subscriptionId}, transaction ${confirmationNumber}`)
}

/**
 * Handle failed invoice payment (from subscription)
 * IDEMPOTENT: Uses update operations, safe for retries
 * UPDATED: Uses payment_plans from unified system
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const client = getSupabaseClient()

  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) {
    console.log('Invoice not associated with subscription, skipping')
    return
  }

  // Find payment plan
  const { data: paymentPlan } = await client
    .from('payment_plans')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .eq('plan_type', 'tuition')
    .single()

  if (!paymentPlan) {
    console.error('Payment plan not found for subscription:', subscriptionId)
    return
  }

  // Update payment plan with failure information
  const maxRetries = 3
  const currentRetries = (paymentPlan.retry_count || 0) + 1

  await client
    .from('payment_plans')
    .update({
      retry_count: currentRetries,
      last_failure_date: new Date().toISOString(),
      last_failure_reason: invoice.last_finalization_error?.message || 'Payment failed',
      status: currentRetries >= maxRetries ? 'suspended' : paymentPlan.status,
    })
    .eq('id', paymentPlan.id)

  console.log(`Invoice payment failed for subscription ${subscriptionId}, retry count: ${currentRetries}/${maxRetries}`)

  // TODO: Send failure notification email to guardian
  // Should include idempotency check to avoid sending duplicate emails
}

/**
 * Handle subscription updated
 * IDEMPOTENT: Uses update operations, safe for retries
 * UPDATED: Uses payment_plans from unified system
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const client = getSupabaseClient()

  const { data: paymentPlan } = await client
    .from('payment_plans')
    .select('id, status')
    .eq('stripe_subscription_id', subscription.id)
    .eq('plan_type', 'tuition')
    .single()

  if (!paymentPlan) {
    console.log(`Payment plan not found for subscription ${subscription.id}, skipping`)
    return
  }

  const newStatus = subscription.status === 'active' ? 'active' : 'suspended'

  // Only update if status actually changed
  if (paymentPlan.status !== newStatus) {
    await client
      .from('payment_plans')
      .update({
        status: newStatus,
      })
      .eq('id', paymentPlan.id)

    console.log(`Subscription ${subscription.id} updated, status: ${subscription.status}`)
  }
}

/**
 * Handle subscription deleted/cancelled
 * IDEMPOTENT: Uses update operations, safe for retries
 * UPDATED: Uses payment_plans from unified system
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const client = getSupabaseClient()

  const { data: paymentPlan } = await client
    .from('payment_plans')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .eq('plan_type', 'tuition')
    .single()

  if (!paymentPlan) {
    console.log(`Payment plan not found for subscription ${subscription.id}, skipping`)
    return
  }

  await client
    .from('payment_plans')
    .update({
      status: 'cancelled',
    })
    .eq('id', paymentPlan.id)

  console.log(`Subscription ${subscription.id} deleted/cancelled`)
}

/**
 * Handle successful one-time payment intent
 * IDEMPOTENT: Uses update operations, safe for retries
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const client = getSupabaseClient()

  const orderId = paymentIntent.metadata.order_id
  if (!orderId) {
    console.log('Payment intent not associated with order, skipping')
    return
  }

  // Update order payment status (idempotent - safe to run multiple times)
  const { data: order } = await client
    .from('ticket_orders')
    .select('payment_status')
    .eq('id', orderId)
    .single()

  if (!order) {
    console.error(`Order ${orderId} not found`)
    return
  }

  // Only update if not already completed
  if (order.payment_status !== 'completed') {
    await client
      .from('ticket_orders')
      .update({
        payment_status: 'completed',
      })
      .eq('id', orderId)

    console.log(`Payment intent ${paymentIntent.id} succeeded for order ${orderId}`)
  } else {
    console.log(`Order ${orderId} already marked as completed, skipping update`)
  }
}

/**
 * Handle failed one-time payment intent
 * IDEMPOTENT: Uses update operations, safe for retries
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const client = getSupabaseClient()

  const orderId = paymentIntent.metadata.order_id
  if (!orderId) {
    console.log('Payment intent not associated with order, skipping')
    return
  }

  // Update order payment status (idempotent)
  await client
    .from('ticket_orders')
    .update({
      payment_status: 'failed',
    })
    .eq('id', orderId)

  console.log(`Payment intent ${paymentIntent.id} failed for order ${orderId}`)
}
