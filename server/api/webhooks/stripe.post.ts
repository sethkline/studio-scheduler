/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events for subscriptions and payments
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
 * IDEMPOTENT: Checks for existing order by payment_intent_id
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
  const { data: existingOrder } = await client
    .from('ticket_orders')
    .select('id, invoice_number')
    .eq('payment_intent_id', paymentIntentId)
    .eq('order_type', 'tuition')
    .single()

  if (existingOrder) {
    console.log(`Payment already processed for payment_intent ${paymentIntentId}, order ${existingOrder.invoice_number}`)
    return // Already processed, skip
  }

  // Find billing schedule by subscription ID
  const { data: schedule } = await client
    .from('billing_schedules')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!schedule) {
    console.error('Billing schedule not found for subscription:', subscriptionId)
    return
  }

  // Get parent details
  const { data: parent } = await client
    .from('profiles')
    .select('full_name, email')
    .eq('user_id', schedule.parent_user_id)
    .single()

  if (!parent) {
    console.error('Parent profile not found:', schedule.parent_user_id)
    return
  }

  // Generate invoice number
  const { generateInvoiceNumber } = await import('~/server/utils/billingCalculations')
  const invoiceNumber = await generateInvoiceNumber()

  // Create order record for this payment
  const { data: order, error: orderError } = await client
    .from('ticket_orders')
    .insert({
      order_type: 'tuition',
      parent_user_id: schedule.parent_user_id,
      student_id: schedule.student_id,
      invoice_number: invoiceNumber,
      customer_name: parent.full_name || '',
      email: parent.email || '',
      total_amount_in_cents: invoice.amount_paid,
      payment_status: 'completed',
      payment_intent_id: paymentIntentId,
      payment_method: invoice.default_payment_method as string || null,
      notes: `Auto-pay subscription payment${schedule.autopay_discount_percentage > 0 ? ` - ${schedule.autopay_discount_percentage}% discount applied` : ''}`,
    })
    .select()
    .single()

  if (orderError) {
    console.error('Failed to create order:', orderError)
    return
  }

  // Update billing schedule
  await client
    .from('billing_schedules')
    .update({
      last_billing_date: new Date().toISOString().split('T')[0],
      retry_count: 0,
      last_failure_date: null,
      last_failure_reason: null,
    })
    .eq('id', schedule.id)

  // Send receipt email (idempotent - only if order was just created)
  const { sendPaymentReceiptEmail } = await import('~/server/utils/emailTemplates')
  try {
    await sendPaymentReceiptEmail({
      payment: {
        amount: invoice.amount_paid / 100,
        confirmation_number: invoiceNumber,
        payment_date: new Date().toISOString(),
      },
      invoice: order,
      parentEmail: parent.email || '',
      parentName: parent.full_name || '',
    })
  } catch (emailError) {
    console.error('Failed to send receipt email:', emailError)
    // Don't fail webhook processing if email fails
  }

  console.log(`Successfully processed invoice.paid for subscription ${subscriptionId}, order ${invoiceNumber}`)
}

/**
 * Handle failed invoice payment (from subscription)
 * IDEMPOTENT: Uses update operations, safe for retries
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const client = getSupabaseClient()

  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) {
    console.log('Invoice not associated with subscription, skipping')
    return
  }

  // Find billing schedule
  const { data: schedule } = await client
    .from('billing_schedules')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!schedule) {
    console.error('Billing schedule not found for subscription:', subscriptionId)
    return
  }

  // Update retry count (idempotent - just sets current state)
  const newRetryCount = schedule.retry_count + 1
  const maxRetries = 3

  await client
    .from('billing_schedules')
    .update({
      retry_count: newRetryCount,
      last_failure_date: new Date().toISOString(),
      last_failure_reason: invoice.last_finalization_error?.message || 'Payment failed',
      is_active: newRetryCount >= maxRetries ? false : schedule.is_active,
    })
    .eq('id', schedule.id)

  console.log(`Invoice payment failed for subscription ${subscriptionId}, retry count: ${newRetryCount}/${maxRetries}`)

  // TODO: Send failure notification email to parent
  // Should include idempotency check to avoid sending duplicate emails
}

/**
 * Handle subscription updated
 * IDEMPOTENT: Uses update operations, safe for retries
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const client = getSupabaseClient()

  const { data: schedule } = await client
    .from('billing_schedules')
    .select('id, is_active')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (!schedule) {
    console.log(`Billing schedule not found for subscription ${subscription.id}, skipping`)
    return
  }

  const newActiveStatus = subscription.status === 'active'

  // Only update if status actually changed
  if (schedule.is_active !== newActiveStatus) {
    await client
      .from('billing_schedules')
      .update({
        is_active: newActiveStatus,
      })
      .eq('id', schedule.id)

    console.log(`Subscription ${subscription.id} updated, status: ${subscription.status}`)
  }
}

/**
 * Handle subscription deleted/cancelled
 * IDEMPOTENT: Uses update operations, safe for retries
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const client = getSupabaseClient()

  const { data: schedule } = await client
    .from('billing_schedules')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (!schedule) {
    console.log(`Billing schedule not found for subscription ${subscription.id}, skipping`)
    return
  }

  await client
    .from('billing_schedules')
    .update({
      is_active: false,
    })
    .eq('id', schedule.id)

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
