// server/api/payroll/adjustments/index.get.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)

    let adjustmentsQuery = client
      .from('payroll_adjustments')
      .select(`
        *,
        teacher:teachers(id, first_name, last_name, email),
        payroll_period:payroll_periods(id, period_name, start_date, end_date)
      `)
      .order('created_at', { ascending: false })

    // Filter by payroll period
    if (query.payroll_period_id) {
      adjustmentsQuery = adjustmentsQuery.eq('payroll_period_id', query.payroll_period_id)
    }

    // Filter by teacher
    if (query.teacher_id) {
      adjustmentsQuery = adjustmentsQuery.eq('teacher_id', query.teacher_id)
    }

    // Filter by adjustment type
    if (query.adjustment_type) {
      adjustmentsQuery = adjustmentsQuery.eq('adjustment_type', query.adjustment_type)
    }

    // Filter by status
    if (query.status) {
      adjustmentsQuery = adjustmentsQuery.eq('status', query.status)
    }

    const { data, error } = await adjustmentsQuery

    if (error) throw error

    return {
      success: true,
      data
    }
  } catch (error: any) {
    console.error('Get adjustments error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch adjustments'
    })
  }
})
