// server/api/payroll/pay-rates/index.post.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)

    // Validate required fields
    if (!body.teacher_id || !body.rate_type || !body.rate_amount || !body.effective_from) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: teacher_id, rate_type, rate_amount, effective_from'
      })
    }

    // Validate rate_type
    const validRateTypes = ['hourly', 'per_class', 'salary']
    if (!validRateTypes.includes(body.rate_type)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid rate_type. Must be one of: hourly, per_class, salary'
      })
    }

    // Validate rate_amount
    if (body.rate_amount < 0) {
      throw createError({
        statusCode: 400,
        message: 'Rate amount must be greater than or equal to 0'
      })
    }

    const { data, error } = await client
      .from('teacher_pay_rates')
      .insert({
        teacher_id: body.teacher_id,
        rate_type: body.rate_type,
        rate_amount: body.rate_amount,
        currency: body.currency || 'USD',
        effective_from: body.effective_from,
        effective_to: body.effective_to || null,
        class_definition_id: body.class_definition_id || null,
        dance_style_id: body.dance_style_id || null,
        overtime_enabled: body.overtime_enabled || false,
        overtime_threshold_hours: body.overtime_threshold_hours || null,
        overtime_multiplier: body.overtime_multiplier || 1.5,
        notes: body.notes || null
      })
      .select(`
        *,
        teacher:teachers(id, first_name, last_name, email)
      `)
      .single()

    if (error) throw error

    return {
      success: true,
      data
    }
  } catch (error: any) {
    console.error('Create pay rate error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to create pay rate'
    })
  }
})
