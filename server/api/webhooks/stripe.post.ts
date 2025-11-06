/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events for subscriptions and payments
 */

import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2024-11-20.acacia',
  })

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
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const client = getSupabaseClient()

  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) {
    console.log('Invoice not associated with subscription, skipping')
    return
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

  // Create order record for this payment
  const { data: parent } = await client
    .from('profiles')
    .select('full_name, email')
    .eq('user_id', schedule.parent_user_id)
    .single()

  const { generateInvoiceNumber } = await import('~/server/utils/billingCalculations')
  const invoiceNumber = await generateInvoiceNumber()

  const { data: order } = await client
    .from('ticket_orders')
    .insert({
      order_type: 'tuition',
      parent_user_id: schedule.parent_user_id,
      student_id: schedule.student_id,
      invoice_number: invoiceNumber,
      customer_name: parent?.full_name || '',
      email: parent?.email || '',
      total_amount_in_cents: invoice.amount_paid,
      payment_status: 'completed',
      payment_intent_id: invoice.payment_intent as string,
      notes: `Auto-pay subscription payment - ${schedule.autopay_discount_percentage > 0 ? `${schedule.autopay_discount_percentage}% discount applied` : 'No discount'}`,
    })
    .select()
    .single()

  if (order) {
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

    // Send receipt email
    const { sendPaymentReceiptEmail } = await import('~/server/utils/emailTemplates')
    try {
      await sendPaymentReceiptEmail({
        payment: {
          amount: invoice.amount_paid / 100,
          confirmation_number: invoiceNumber,
          payment_date: new Date().toISOString(),
        },
        invoice: order,
        parentEmail: parent?.email || '',
        parentName: parent?.full_name || '',
      })
    } catch (emailError) {
      console.error('Failed to send receipt email:', emailError)
    }
  }

  console.log(`Invoice paid successfully for subscription ${subscriptionId}`)
}

/**
 * Handle failed invoice payment (from subscription)
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

  // Update retry count
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

  // TODO: Send failure notification email to parent
  console.log(`Invoice payment failed for subscription ${subscriptionId}, retry count: ${newRetryCount}`)
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const client = getSupabaseClient()

  const { data: schedule } = await client
    .from('billing_schedules')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (schedule) {
    await client
      .from('billing_schedules')
      .update({
        is_active: subscription.status === 'active',
      })
      .eq('id', schedule.id)

    console.log(`Subscription ${subscription.id} updated, status: ${subscription.status}`)
  }
}

/**
 * Handle subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const client = getSupabaseClient()

  const { data: schedule } = await client
    .from('billing_schedules')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (schedule) {
    await client
      .from('billing_schedules')
      .update({
        is_active: false,
      })
      .eq('id', schedule.id)

    console.log(`Subscription ${subscription.id} deleted`)
  }
}

/**
 * Handle successful one-time payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const client = getSupabaseClient()

  // Check if this is for a tuition order
  const orderId = paymentIntent.metadata.order_id
  if (!orderId) {
    console.log('Payment intent not associated with order, skipping')
    return
  }

  // Update order payment status
  await client
    .from('ticket_orders')
    .update({
      payment_status: 'completed',
    })
    .eq('id', orderId)

  console.log(`Payment intent ${paymentIntent.id} succeeded for order ${orderId}`)
}

/**
 * Handle failed one-time payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const client = getSupabaseClient()

  const orderId = paymentIntent.metadata.order_id
  if (!orderId) {
    console.log('Payment intent not associated with order, skipping')
    return
  }

  // Update order payment status
  await client
    .from('ticket_orders')
    .update({
      payment_status: 'failed',
    })
    .eq('id', orderId)

  console.log(`Payment intent ${paymentIntent.id} failed for order ${orderId}`)
}
