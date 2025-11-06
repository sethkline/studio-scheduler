// server/api/payroll/adjustments/index.post.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)

    // Validate required fields
    if (!body.payroll_period_id || !body.teacher_id || !body.adjustment_type || !body.amount || !body.description) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: payroll_period_id, teacher_id, adjustment_type, amount, description'
      })
    }

    // Validate adjustment_type
    const validAdjustmentTypes = ['bonus', 'deduction', 'reimbursement', 'correction', 'other']
    if (!validAdjustmentTypes.includes(body.adjustment_type)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid adjustment_type. Must be one of: bonus, deduction, reimbursement, correction, other'
      })
    }

    const { data, error } = await client
      .from('payroll_adjustments')
      .insert({
        payroll_period_id: body.payroll_period_id,
        teacher_id: body.teacher_id,
        adjustment_type: body.adjustment_type,
        adjustment_category: body.adjustment_category || null,
        amount: body.amount,
        description: body.description,
        is_taxable: body.is_taxable !== undefined ? body.is_taxable : true,
        status: body.status || 'pending'
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
    console.error('Create adjustment error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to create adjustment'
    })
  }
})
