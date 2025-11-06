/**
 * POST /api/billing/jobs/process-autopay
 * Process auto-pay billing schedules
 * Should be run daily to charge payment methods for due invoices
 */

import Stripe from 'stripe'
import { sendPaymentReceiptEmail } from '~/server/utils/emailTemplates'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2024-11-20.acacia',
  })

  const client = getSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  const results = {
    success: true,
    payments_processed: 0,
    payments_failed: 0,
    total_amount: 0,
    errors: [] as any[],
  }

  try {
    // Get all active billing schedules due today
    const { data: billingSchedules, error: schedulesError } = await client
      .from('billing_schedules')
      .select(`
        *,
        payment_method:payment_methods(*)
      `)
      .eq('is_active', true)
      .lte('next_billing_date', today)

    if (schedulesError) {
      throw new Error(`Failed to fetch billing schedules: ${schedulesError.message}`)
    }

    if (!billingSchedules || billingSchedules.length === 0) {
      return {
        ...results,
        message: 'No billing schedules due today',
      }
    }

    // Process each billing schedule
    for (const schedule of billingSchedules) {
      try {
        // Get outstanding invoices for this parent
        const { data: invoices, error: invoicesError } = await client
          .from('invoices')
          .select('*')
          .eq('parent_user_id', schedule.parent_user_id)
          .in('status', ['sent', 'viewed', 'partial_paid', 'overdue'])
          .gt('amount_due', 0)
          .order('due_date', { ascending: true })

        if (invoicesError || !invoices || invoices.length === 0) {
          // No invoices to pay, update next billing date
          const nextBillingDate = new Date()
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
          nextBillingDate.setDate(schedule.billing_day)

          await client
            .from('billing_schedules')
            .update({
              next_billing_date: nextBillingDate.toISOString().split('T')[0],
              last_billing_date: today,
            })
            .eq('id', schedule.id)

          continue
        }

        // Get parent profile
        const { data: parent } = await client
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', schedule.parent_user_id)
          .single()

        if (!parent) {
          results.errors.push({
            schedule_id: schedule.id,
            error: 'Parent profile not found',
          })
          results.payments_failed++
          continue
        }

        // Process payment for each outstanding invoice
        for (const invoice of invoices) {
          try {
            const paymentAmount = invoice.amount_due

            // Apply autopay discount if configured
            let discountedAmount = paymentAmount
            if (schedule.autopay_discount_percentage > 0) {
              const discount = (paymentAmount * schedule.autopay_discount_percentage) / 100
              discountedAmount = paymentAmount - discount
            }

            // Create payment intent and charge immediately
            const paymentIntent = await stripe.paymentIntents.create({
              amount: Math.round(discountedAmount * 100), // Convert to cents
              currency: 'usd',
              customer: schedule.payment_method.stripe_customer_id,
              payment_method: schedule.payment_method.stripe_payment_method_id,
              off_session: true,
              confirm: true,
              metadata: {
                invoice_id: invoice.id,
                invoice_number: invoice.invoice_number,
                parent_user_id: schedule.parent_user_id,
                autopay: 'true',
              },
            })

            if (paymentIntent.status !== 'succeeded') {
              throw new Error(`Payment intent status: ${paymentIntent.status}`)
            }

            // Generate confirmation number
            const confirmationNumber = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

            // Record payment
            const { data: payment, error: paymentError } = await client
              .from('payments')
              .insert({
                parent_user_id: schedule.parent_user_id,
                invoice_id: invoice.id,
                amount: discountedAmount,
                payment_status: 'succeeded',
                payment_method_type: 'card',
                stripe_payment_intent_id: paymentIntent.id,
                stripe_charge_id: paymentIntent.latest_charge as string,
                stripe_customer_id: schedule.payment_method.stripe_customer_id,
                stripe_payment_method_id: schedule.payment_method.stripe_payment_method_id,
                payment_date: new Date().toISOString(),
                confirmation_number: confirmationNumber,
                allocated_to_invoice: true,
                notes: schedule.autopay_discount_percentage > 0
                  ? `Auto-pay with ${schedule.autopay_discount_percentage}% discount`
                  : 'Auto-pay',
              })
              .select()
              .single()

            if (paymentError) {
              throw new Error(`Failed to record payment: ${paymentError.message}`)
            }

            // Create payment allocation
            await client
              .from('payment_allocations')
              .insert({
                payment_id: payment.id,
                invoice_id: invoice.id,
                allocated_amount: discountedAmount,
              })

            // Send receipt email
            try {
              await sendPaymentReceiptEmail({
                payment,
                invoice,
                parentEmail: parent.email,
                parentName: parent.full_name,
              })

              await client
                .from('payments')
                .update({
                  receipt_email_sent: true,
                  receipt_sent_at: new Date().toISOString(),
                })
                .eq('id', payment.id)
            } catch (emailError) {
              console.error('Failed to send receipt email:', emailError)
            }

            results.payments_processed++
            results.total_amount += discountedAmount

            // Reset retry count on success
            await client
              .from('billing_schedules')
              .update({
                retry_count: 0,
                last_failure_date: null,
                last_failure_reason: null,
              })
              .eq('id', schedule.id)

          } catch (paymentError: any) {
            console.error('Payment failed:', paymentError)
            results.errors.push({
              schedule_id: schedule.id,
              invoice_id: invoice.id,
              error: paymentError.message,
            })
            results.payments_failed++

            // Update retry count and failure info
            const newRetryCount = schedule.retry_count + 1
            const maxRetries = 3

            await client
              .from('billing_schedules')
              .update({
                retry_count: newRetryCount,
                last_failure_date: new Date().toISOString(),
                last_failure_reason: paymentError.message,
                is_active: newRetryCount >= maxRetries ? false : schedule.is_active,
              })
              .eq('id', schedule.id)

            // TODO: Send failure notification email to parent
          }
        }

        // Update next billing date
        const nextBillingDate = new Date()
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
        nextBillingDate.setDate(schedule.billing_day)

        await client
          .from('billing_schedules')
          .update({
            next_billing_date: nextBillingDate.toISOString().split('T')[0],
            last_billing_date: today,
          })
          .eq('id', schedule.id)

      } catch (error: any) {
        results.errors.push({
          schedule_id: schedule.id,
          error: error.message,
        })
        results.payments_failed++
      }
    }

    return {
      ...results,
      message: `Processed ${results.payments_processed} payments. ${results.payments_failed} failed.`,
    }

  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to process auto-pay: ${error.message}`,
    })
  }
})
