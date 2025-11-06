/**
 * POST /api/billing/refunds/[id]/approve
 * Approve and process a refund (Admin/Staff only)
 */

import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2024-11-20.acacia',
  })

  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Refund ID is required',
    })
  }

  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Fetch refund with payment details
  const { data: refund, error: refundError } = await client
    .from('refunds')
    .select(`
      *,
      payment:payments(*)
    `)
    .eq('id', id)
    .single()

  if (refundError || !refund) {
    throw createError({
      statusCode: 404,
      message: 'Refund not found',
    })
  }

  if (refund.refund_status !== 'pending') {
    throw createError({
      statusCode: 400,
      message: `Refund cannot be approved. Current status: ${refund.refund_status}`,
    })
  }

  try {
    // Update refund status to approved
    await client
      .from('refunds')
      .update({
        refund_status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)

    // Process refund based on type
    if (refund.is_studio_credit) {
      // Create or update studio credit balance
      const { data: existingCredit } = await client
        .from('studio_credits')
        .select('id, total_credit')
        .eq('parent_user_id', refund.payment.parent_user_id)
        .single()

      let studioCreditId: string

      if (existingCredit) {
        // Update existing credit
        await client
          .from('studio_credits')
          .update({
            total_credit: existingCredit.total_credit + refund.refund_amount,
          })
          .eq('id', existingCredit.id)

        studioCreditId = existingCredit.id
      } else {
        // Create new credit
        const { data: newCredit } = await client
          .from('studio_credits')
          .insert({
            parent_user_id: refund.payment.parent_user_id,
            total_credit: refund.refund_amount,
            used_credit: 0,
          })
          .select()
          .single()

        studioCreditId = newCredit!.id
      }

      // Record transaction
      await client
        .from('studio_credit_transactions')
        .insert({
          studio_credit_id: studioCreditId,
          transaction_type: 'credit',
          amount: refund.refund_amount,
          description: `Refund: ${refund.reason}`,
          refund_id: refund.id,
        })

      // Mark refund as completed
      await client
        .from('refunds')
        .update({
          refund_status: 'completed',
          studio_credit_balance: studioCreditId,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)

    } else {
      // Process Stripe refund
      if (!refund.payment.stripe_charge_id) {
        throw new Error('Payment does not have a Stripe charge ID')
      }

      // Update status to processing
      await client
        .from('refunds')
        .update({
          refund_status: 'processing',
          processed_at: new Date().toISOString(),
        })
        .eq('id', id)

      // Create Stripe refund
      const stripeRefund = await stripe.refunds.create({
        charge: refund.payment.stripe_charge_id,
        amount: Math.round(refund.refund_amount * 100), // Convert to cents
        reason: 'requested_by_customer',
        metadata: {
          refund_id: refund.id,
          invoice_id: refund.invoice_id || '',
          parent_user_id: refund.payment.parent_user_id,
        },
      })

      // Update refund with Stripe refund ID
      await client
        .from('refunds')
        .update({
          refund_status: 'completed',
          stripe_refund_id: stripeRefund.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)

      // Update payment status
      const totalRefunded = refund.refund_amount
      if (totalRefunded >= refund.payment.amount) {
        await client
          .from('payments')
          .update({ payment_status: 'refunded' })
          .eq('id', refund.payment_id)
      }
    }

    // If refund is for an invoice, adjust the invoice
    if (refund.invoice_id) {
      const { data: invoice } = await client
        .from('invoices')
        .select('*')
        .eq('id', refund.invoice_id)
        .single()

      if (invoice) {
        const newAmountPaid = Math.max(0, invoice.amount_paid - refund.refund_amount)
        const newAmountDue = invoice.total_amount - newAmountPaid

        await client
          .from('invoices')
          .update({
            amount_paid: newAmountPaid,
            amount_due: newAmountDue,
            status: newAmountDue > 0 ? 'partial_paid' : 'refunded',
          })
          .eq('id', refund.invoice_id)
      }
    }

    // Fetch updated refund
    const { data: updatedRefund } = await client
      .from('refunds')
      .select('*')
      .eq('id', id)
      .single()

    return {
      success: true,
      data: updatedRefund,
      message: refund.is_studio_credit
        ? 'Refund approved and studio credit applied'
        : 'Refund approved and processed successfully',
    }

  } catch (error: any) {
    // Mark refund as failed
    await client
      .from('refunds')
      .update({
        refund_status: 'failed',
      })
      .eq('id', id)

    throw createError({
      statusCode: 500,
      message: `Failed to process refund: ${error.message}`,
    })
  }
})
