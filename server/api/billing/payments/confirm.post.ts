/**
 * POST /api/billing/payments/confirm
 * Confirm a payment after Stripe processing
 */

import Stripe from 'stripe'
import { sendPaymentReceiptEmail } from '~/server/utils/emailTemplates'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2024-11-20.acacia',
  })

  const client = getSupabaseClient()
  const body = await readBody<{
    payment_intent_id: string
  }>(event)

  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  if (!body.payment_intent_id) {
    throw createError({
      statusCode: 400,
      message: 'Payment intent ID is required',
    })
  }

  // Retrieve payment intent from Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(body.payment_intent_id)

  if (paymentIntent.status !== 'succeeded') {
    throw createError({
      statusCode: 400,
      message: `Payment has not succeeded. Status: ${paymentIntent.status}`,
    })
  }

  // Check if payment already recorded
  const { data: existingPayment } = await client
    .from('payments')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single()

  if (existingPayment) {
    return {
      success: true,
      data: existingPayment,
      message: 'Payment already recorded',
    }
  }

  const invoiceId = paymentIntent.metadata.invoice_id
  const amount = paymentIntent.amount / 100 // Convert from cents

  // Generate confirmation number
  const confirmationNumber = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

  // Create payment record
  const { data: payment, error: paymentError } = await client
    .from('payments')
    .insert({
      parent_user_id: user.id,
      invoice_id: invoiceId || null,
      amount,
      payment_status: 'succeeded',
      payment_method_type: 'card',
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: paymentIntent.latest_charge as string,
      stripe_customer_id: paymentIntent.customer as string,
      stripe_payment_method_id: paymentIntent.payment_method as string,
      payment_date: new Date().toISOString(),
      confirmation_number: confirmationNumber,
      allocated_to_invoice: !!invoiceId,
    })
    .select()
    .single()

  if (paymentError) {
    throw createError({
      statusCode: 500,
      message: `Failed to record payment: ${paymentError.message}`,
    })
  }

  // If payment is for a specific invoice, create allocation
  if (invoiceId) {
    await client
      .from('payment_allocations')
      .insert({
        payment_id: payment.id,
        invoice_id: invoiceId,
        allocated_amount: amount,
      })
  }

  // Fetch invoice and parent details for receipt email
  if (invoiceId) {
    const { data: invoice } = await client
      .from('invoices')
      .select(`
        *,
        parent:profiles!invoices_parent_user_id_fkey(full_name, email)
      `)
      .eq('id', invoiceId)
      .single()

    // Send receipt email
    if (invoice) {
      try {
        await sendPaymentReceiptEmail({
          payment,
          invoice,
          parentEmail: invoice.parent.email,
          parentName: invoice.parent.full_name,
        })

        // Update payment record
        await client
          .from('payments')
          .update({
            receipt_email_sent: true,
            receipt_sent_at: new Date().toISOString(),
          })
          .eq('id', payment.id)
      } catch (emailError) {
        console.error('Failed to send receipt email:', emailError)
        // Don't fail the request if email fails
      }
    }
  }

  return {
    success: true,
    data: payment,
    message: 'Payment confirmed successfully',
  }
})
