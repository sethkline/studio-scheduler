import { getSupabaseClient } from '~/server/utils/supabase'
import Stripe from 'stripe'
import { logError } from '~/server/utils/logger'

/**
 * Create Stripe Checkout Session
 *
 * POST /api/payments/create-checkout-session
 *
 * Creates a Stripe checkout session for one or more student fees.
 * Used primarily by the parent payment portal.
 *
 * @body {
 *   fee_ids: string[]
 *   success_url: string
 *   cancel_url: string
 * }
 *
 * @returns {
 *   url: string (Stripe checkout URL)
 *   session_id: string
 * }
 */
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody(event)

  // Validate required fields
  if (!body.fee_ids || !Array.isArray(body.fee_ids) || body.fee_ids.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least one fee ID is required'
    })
  }

  if (!body.success_url || !body.cancel_url) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Success URL and cancel URL are required'
    })
  }

  try {
    // Fetch all student fees
    const { data: studentFees, error: feesError } = await client
      .from('student_recital_fees')
      .select(`
        *,
        student:students(*),
        recital_show:recital_shows(name),
        fee_type:recital_fee_types(name)
      `)
      .in('id', body.fee_ids)

    if (feesError || !studentFees || studentFees.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No fees found'
      })
    }

    // Calculate total and create line items
    const lineItems = studentFees.map(fee => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${fee.fee_type.name} - ${fee.recital_show.name}`,
          description: `For ${fee.student.first_name} ${fee.student.last_name}`,
        },
        unit_amount: fee.balance_in_cents, // Use balance, not total
      },
      quantity: 1,
    }))

    // Initialize Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      const error = new Error('STRIPE_SECRET_KEY environment variable not set')
      logError(error, { context: 'stripe_initialization' })
      throw createError({
        statusCode: 500,
        statusMessage: 'Payment processing is not configured'
      })
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2022-11-15'
    })

    // Create metadata with fee IDs
    const metadata: any = {
      fee_count: studentFees.length.toString(),
    }
    studentFees.forEach((fee, index) => {
      metadata[`fee_id_${index}`] = fee.id
    })

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: body.success_url,
      cancel_url: body.cancel_url,
      metadata,
      payment_intent_data: {
        metadata,
      },
    })

    return {
      url: session.url,
      session_id: session.id
    }
  } catch (error: any) {
    logError(error, {
      context: 'create_checkout_session',
      fee_ids: body.fee_ids,
    })
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create checkout session'
    })
  }
})
