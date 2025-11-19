import { getSupabaseClient } from '~/server/utils/supabase'

/**
 * Record Payment
 *
 * POST /api/payments/record
 *
 * Records a payment for a student fee.
 *
 * @body {
 *   student_fee_id: string
 *   amount_in_cents: number
 *   payment_method: 'credit_card' | 'cash' | 'check' | 'bank_transfer' | 'other'
 *   check_number?: string
 *   transaction_id?: string
 *   payment_date: string (ISO date)
 *   notes?: string
 *   stripe_payment_intent_id?: string (for Stripe payments)
 * }
 *
 * @returns {
 *   message: string
 *   payment: RecitalPaymentTransaction
 *   updated_fee: StudentRecitalFee
 * }
 */
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody(event)

  // Validate required fields
  if (!body.student_fee_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Student fee ID is required'
    })
  }

  if (!body.amount_in_cents || body.amount_in_cents <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Payment amount must be greater than zero'
    })
  }

  if (!body.payment_method) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Payment method is required'
    })
  }

  const validPaymentMethods = ['credit_card', 'cash', 'check', 'bank_transfer', 'other']
  if (!validPaymentMethods.includes(body.payment_method)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Payment method must be one of: ${validPaymentMethods.join(', ')}`
    })
  }

  if (!body.payment_date) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Payment date is required'
    })
  }

  // Validate check number if payment method is check
  if (body.payment_method === 'check' && !body.check_number) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Check number is required for check payments'
    })
  }

  try {
    // Fetch student fee to validate payment amount
    const { data: studentFee, error: feeError } = await client
      .from('student_recital_fees')
      .select('*')
      .eq('id', body.student_fee_id)
      .single()

    if (feeError || !studentFee) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Student fee not found'
      })
    }

    // Check if payment amount exceeds balance
    if (body.amount_in_cents > studentFee.balance_in_cents) {
      throw createError({
        statusCode: 400,
        statusMessage: `Payment amount ($${(body.amount_in_cents / 100).toFixed(2)}) exceeds outstanding balance ($${(studentFee.balance_in_cents / 100).toFixed(2)})`
      })
    }

    // Create payment transaction
    const paymentData = {
      student_fee_id: body.student_fee_id,
      amount_in_cents: body.amount_in_cents,
      payment_method: body.payment_method,
      check_number: body.check_number || null,
      transaction_id: body.transaction_id || null,
      payment_date: body.payment_date,
      payment_status: 'completed',
      stripe_payment_intent_id: body.stripe_payment_intent_id || null,
      notes: body.notes || null,
    }

    const { data: payment, error: paymentError } = await client
      .from('recital_payment_transactions')
      .insert([paymentData])
      .select()
      .single()

    if (paymentError) {
      console.error('Database error creating payment:', paymentError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to record payment'
      })
    }

    // Update student fee balances
    const newAmountPaid = studentFee.amount_paid_in_cents + body.amount_in_cents
    const newBalance = studentFee.total_amount_in_cents - newAmountPaid

    // Determine new status
    let newStatus = studentFee.status
    if (newBalance === 0) {
      newStatus = 'paid'
    } else if (newBalance < studentFee.total_amount_in_cents) {
      newStatus = 'partial'
    }

    const { data: updatedFee, error: updateError } = await client
      .from('student_recital_fees')
      .update({
        amount_paid_in_cents: newAmountPaid,
        balance_in_cents: newBalance,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.student_fee_id)
      .select()
      .single()

    if (updateError) {
      console.error('Database error updating student fee:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Payment recorded but failed to update fee balance'
      })
    }

    return {
      message: 'Payment recorded successfully',
      payment,
      updated_fee: updatedFee
    }
  } catch (error: any) {
    console.error('Error recording payment:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to record payment'
    })
  }
})
