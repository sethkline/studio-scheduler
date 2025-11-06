// server/api/payroll/pay-rates/[id].put.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'Pay rate ID is required'
      })
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.rate_type) {
      const validRateTypes = ['hourly', 'per_class', 'salary']
      if (!validRateTypes.includes(body.rate_type)) {
        throw createError({
          statusCode: 400,
          message: 'Invalid rate_type'
        })
      }
      updateData.rate_type = body.rate_type
    }

    if (body.rate_amount !== undefined) {
      if (body.rate_amount < 0) {
        throw createError({
          statusCode: 400,
          message: 'Rate amount must be greater than or equal to 0'
        })
      }
      updateData.rate_amount = body.rate_amount
    }

    if (body.effective_from) updateData.effective_from = body.effective_from
    if (body.effective_to !== undefined) updateData.effective_to = body.effective_to
    if (body.overtime_enabled !== undefined) updateData.overtime_enabled = body.overtime_enabled
    if (body.overtime_threshold_hours !== undefined) updateData.overtime_threshold_hours = body.overtime_threshold_hours
    if (body.overtime_multiplier !== undefined) updateData.overtime_multiplier = body.overtime_multiplier
    if (body.notes !== undefined) updateData.notes = body.notes

    const { data, error } = await client
      .from('teacher_pay_rates')
      .update(updateData)
      .eq('id', id)
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
    console.error('Update pay rate error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to update pay rate'
    })
  }
})
