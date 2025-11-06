/**
 * POST /api/billing/refunds
 * Request a refund for a payment
 */

import type { CreateRefundInput } from '~/types/billing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody<CreateRefundInput>(event)

  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Validate required fields
  if (!body.payment_id || !body.refund_amount || !body.refund_type || !body.reason) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: payment_id, refund_amount, refund_type, reason',
    })
  }

  // Fetch payment
  const { data: payment, error: paymentError } = await client
    .from('payments')
    .select('*')
    .eq('id', body.payment_id)
    .single()

  if (paymentError || !payment) {
    throw createError({
      statusCode: 404,
      message: 'Payment not found',
    })
  }

  // Validate refund amount
  if (body.refund_amount <= 0 || body.refund_amount > payment.amount) {
    throw createError({
      statusCode: 400,
      message: 'Invalid refund amount',
    })
  }

  // Check if payment already refunded
  const { data: existingRefund } = await client
    .from('refunds')
    .select('id, refund_amount')
    .eq('payment_id', body.payment_id)
    .in('refund_status', ['approved', 'processing', 'completed'])

  const totalRefunded = existingRefund?.reduce((sum, r) => sum + r.refund_amount, 0) || 0

  if (totalRefunded + body.refund_amount > payment.amount) {
    throw createError({
      statusCode: 400,
      message: 'Refund amount exceeds available balance',
    })
  }

  // Create refund request
  const { data: refund, error: refundError } = await client
    .from('refunds')
    .insert({
      payment_id: body.payment_id,
      invoice_id: body.invoice_id || payment.invoice_id,
      refund_amount: body.refund_amount,
      refund_type: body.refund_type,
      refund_status: 'pending',
      reason: body.reason,
      internal_notes: body.internal_notes || null,
      requested_by: user.id,
      is_studio_credit: body.is_studio_credit || false,
    })
    .select()
    .single()

  if (refundError) {
    throw createError({
      statusCode: 500,
      message: `Failed to create refund request: ${refundError.message}`,
    })
  }

  return {
    success: true,
    data: refund,
    message: 'Refund request created successfully. Pending approval.',
  }
})
