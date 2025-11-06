// server/api/payroll/periods/index.post.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)

    // Validate required fields
    if (!body.period_name || !body.period_type || !body.start_date || !body.end_date || !body.pay_date) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: period_name, period_type, start_date, end_date, pay_date'
      })
    }

    // Validate period_type
    const validPeriodTypes = ['weekly', 'bi-weekly', 'semi-monthly', 'monthly']
    if (!validPeriodTypes.includes(body.period_type)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid period_type. Must be one of: weekly, bi-weekly, semi-monthly, monthly'
      })
    }

    // Validate dates
    const startDate = new Date(body.start_date)
    const endDate = new Date(body.end_date)
    const payDate = new Date(body.pay_date)

    if (endDate < startDate) {
      throw createError({
        statusCode: 400,
        message: 'End date must be after start date'
      })
    }

    if (payDate < endDate) {
      throw createError({
        statusCode: 400,
        message: 'Pay date must be on or after end date'
      })
    }

    const { data, error } = await client
      .from('payroll_periods')
      .insert({
        period_name: body.period_name,
        period_type: body.period_type,
        start_date: body.start_date,
        end_date: body.end_date,
        pay_date: body.pay_date,
        status: body.status || 'draft',
        notes: body.notes || null
      })
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data
    }
  } catch (error: any) {
    console.error('Create payroll period error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to create payroll period'
    })
  }
})
