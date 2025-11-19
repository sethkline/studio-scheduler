import { requireAuth } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'
import Stripe from 'stripe'

/**
 * Create Stripe Payment Intent for Fee Payment
 *
 * POST /api/payments/create-fee-intent
 *
 * Creates a Stripe payment intent for a student fee payment.
 *
 * @body {
 *   student_fee_id: string
 *   amount_in_cents: number
 *   notes?: string
 * }
 *
 * @returns {
 *   client_secret: string
 *   payment_intent_id: string
 * }
 */
export default defineEventHandler(async (event) => {  await requireAuth(event)

  const client = await getUserSupabaseClient(event)
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
      statusMessage: 'Amount must be greater than zero'
    })
  }

  try {
    // Fetch student fee to get student and recital details
    const { data: studentFee, error: feeError } = await client
      .from('student_recital_fees')
      .select(`
        *,
        student:students(*),
        recital_show:recital_shows(name),
        fee_type:recital_fee_types(name)
      `)
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
        statusMessage: 'Payment amount exceeds outstanding balance'
      })
    }

    // Initialize Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY environment variable not set')
      throw createError({
        statusCode: 500,
        statusMessage: 'Payment processing is not configured'
      })
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2022-11-15'
    })

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: body.amount_in_cents,
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        student_fee_id: body.student_fee_id,
        student_name: `${studentFee.student.first_name} ${studentFee.student.last_name}`,
        recital_name: studentFee.recital_show.name,
        fee_type: studentFee.fee_type.name,
      },
      description: `${studentFee.fee_type.name} - ${studentFee.recital_show.name}`,
    })

    return {
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    }
  } catch (error: any) {
    console.error('Error creating payment intent:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create payment intent'
    })
  }
})
