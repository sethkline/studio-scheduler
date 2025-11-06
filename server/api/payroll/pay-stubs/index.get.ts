// server/api/payroll/pay-stubs/index.get.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)

    let stubsQuery = client
      .from('payroll_pay_stubs')
      .select(`
        *,
        teacher:teachers(id, first_name, last_name, email, phone),
        payroll_period:payroll_periods(id, period_name, start_date, end_date, pay_date)
      `)
      .order('created_at', { ascending: false })

    // Filter by payroll period
    if (query.payroll_period_id) {
      stubsQuery = stubsQuery.eq('payroll_period_id', query.payroll_period_id)
    }

    // Filter by teacher
    if (query.teacher_id) {
      stubsQuery = stubsQuery.eq('teacher_id', query.teacher_id)
    }

    // Filter by status
    if (query.status) {
      stubsQuery = stubsQuery.eq('status', query.status)
    }

    const { data, error } = await stubsQuery

    if (error) throw error

    return {
      success: true,
      data
    }
  } catch (error: any) {
    console.error('Get pay stubs error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch pay stubs'
    })
  }
})
