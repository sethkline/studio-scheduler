/**
 * POST /api/billing/subscriptions/create
 * Create a Stripe Subscription for recurring monthly tuition billing
 */

import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2024-11-20.acacia',
  })

  const client = getSupabaseClient()
  const body = await readBody<{
    student_id: string
    payment_method_id: string
    billing_day?: number
    autopay_discount_percentage?: number
  }>(event)

  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Validate inputs
  if (!body.student_id || !body.payment_method_id) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: student_id, payment_method_id',
    })
  }

  try {
    // Verify student belongs to parent
    const { data: student, error: studentError } = await client
      .from('students')
      .select('id, first_name, last_name, parent_id')
      .eq('id', body.student_id)
      .eq('parent_id', user.id)
      .single()

    if (studentError || !student) {
      throw createError({
        statusCode: 404,
        message: 'Student not found or does not belong to this parent',
      })
    }

    // Get payment method
    const { data: paymentMethod, error: pmError } = await client
      .from('payment_methods')
      .select('*')
      .eq('id', body.payment_method_id)
      .eq('parent_user_id', user.id)
      .single()

    if (pmError || !paymentMethod) {
      throw createError({
        statusCode: 404,
        message: 'Payment method not found',
      })
    }

    // Get or create Stripe customer
    const { data: profile } = await client
      .from('profiles')
      .select('stripe_customer_id, full_name, email')
      .eq('user_id', user.id)
      .single()

    let stripeCustomerId = profile?.stripe_customer_id

    if (!stripeCustomerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        name: profile?.full_name,
        payment_method: paymentMethod.stripe_payment_method_id,
        invoice_settings: {
          default_payment_method: paymentMethod.stripe_payment_method_id,
        },
        metadata: {
          user_id: user.id,
          student_id: student.id,
        },
      })

      stripeCustomerId = customer.id

      // Save customer ID
      await client
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('user_id', user.id)
    } else {
      // Update existing customer with payment method
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethod.stripe_payment_method_id,
        },
      })
    }

    // Calculate monthly amount based on active enrollments
    const { calculateStudentMonthlyTuition } = await import('~/server/utils/billingCalculations')
    const tuitionCalc = await calculateStudentMonthlyTuition(
      student.id,
      new Date().toISOString().split('T')[0]
    )

    let monthlyAmountInCents = tuitionCalc.total_in_cents

    // Apply auto-pay discount if specified
    const autopayDiscount = body.autopay_discount_percentage || 0
    if (autopayDiscount > 0) {
      const discountAmount = Math.round((monthlyAmountInCents * autopayDiscount) / 100)
      monthlyAmountInCents -= discountAmount
    }

    if (monthlyAmountInCents <= 0) {
      throw createError({
        statusCode: 400,
        message: 'No billable enrollments found for this student',
      })
    }

    // Create or retrieve Stripe Price for this amount
    const price = await stripe.prices.create({
      unit_amount: monthlyAmountInCents,
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
      product_data: {
        name: `Monthly Tuition - ${student.first_name} ${student.last_name}`,
        metadata: {
          student_id: student.id,
          parent_user_id: user.id,
        },
      },
      metadata: {
        student_id: student.id,
        parent_user_id: user.id,
      },
    })

    // Create Stripe Subscription
    const billingDay = body.billing_day || 1
    const anchorDate = new Date()
    anchorDate.setDate(billingDay)
    if (anchorDate < new Date()) {
      anchorDate.setMonth(anchorDate.getMonth() + 1)
    }

    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price: price.id,
        },
      ],
      default_payment_method: paymentMethod.stripe_payment_method_id,
      billing_cycle_anchor: Math.floor(anchorDate.getTime() / 1000),
      proration_behavior: 'none',
      metadata: {
        student_id: student.id,
        parent_user_id: user.id,
        autopay_discount_percentage: autopayDiscount.toString(),
      },
    })

    // Create or update billing schedule
    const { data: existingSchedule } = await client
      .from('billing_schedules')
      .select('id')
      .eq('parent_user_id', user.id)
      .eq('student_id', student.id)
      .single()

    const scheduleData = {
      parent_user_id: user.id,
      student_id: student.id,
      payment_method_id: paymentMethod.id,
      stripe_subscription_id: subscription.id,
      stripe_price_id: price.id,
      is_active: true,
      billing_day: billingDay,
      autopay_discount_percentage: autopayDiscount,
      next_billing_date: anchorDate.toISOString().split('T')[0],
      retry_count: 0,
      last_failure_date: null,
      last_failure_reason: null,
    }

    if (existingSchedule) {
      // Update existing schedule
      await client
        .from('billing_schedules')
        .update(scheduleData)
        .eq('id', existingSchedule.id)
    } else {
      // Create new schedule
      await client
        .from('billing_schedules')
        .insert(scheduleData)
    }

    // Update payment method to mark as autopay enabled
    await client
      .from('payment_methods')
      .update({
        is_autopay_enabled: true,
        is_default: true,
      })
      .eq('id', paymentMethod.id)

    return {
      success: true,
      data: {
        subscription_id: subscription.id,
        billing_day: billingDay,
        monthly_amount_in_cents: monthlyAmountInCents,
        next_billing_date: anchorDate.toISOString().split('T')[0],
        autopay_discount_percentage: autopayDiscount,
      },
      message: 'Auto-pay subscription created successfully',
    }

  } catch (error: any) {
    console.error('Create subscription error:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to create subscription: ${error.message}`,
    })
  }
})
