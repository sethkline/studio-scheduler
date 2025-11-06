// server/api/payroll/periods/index.get.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)

    let periodsQuery = client
      .from('payroll_periods')
      .select('*')
      .order('start_date', { ascending: false })

    // Filter by status
    if (query.status) {
      periodsQuery = periodsQuery.eq('status', query.status)
    }

    // Filter by date range
    if (query.start_date) {
      periodsQuery = periodsQuery.gte('start_date', query.start_date)
    }
    if (query.end_date) {
      periodsQuery = periodsQuery.lte('end_date', query.end_date)
    }

    const { data, error } = await periodsQuery

    if (error) throw error

    return {
      success: true,
      data
    }
  } catch (error: any) {
    console.error('Get payroll periods error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch payroll periods'
    })
  }
})
