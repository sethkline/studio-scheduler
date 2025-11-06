// server/api/payroll/time-entries/index.get.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)

    let entriesQuery = client
      .from('payroll_time_entries')
      .select(`
        *,
        teacher:teachers!payroll_time_entries_teacher_id_fkey(id, first_name, last_name, email),
        original_teacher:teachers!payroll_time_entries_original_teacher_id_fkey(id, first_name, last_name),
        payroll_period:payroll_periods(id, period_name, start_date, end_date),
        class_instance:class_instances(id)
      `)
      .order('entry_date', { ascending: false })

    // Filter by payroll period
    if (query.payroll_period_id) {
      entriesQuery = entriesQuery.eq('payroll_period_id', query.payroll_period_id)
    }

    // Filter by teacher
    if (query.teacher_id) {
      entriesQuery = entriesQuery.eq('teacher_id', query.teacher_id)
    }

    // Filter by status
    if (query.status) {
      entriesQuery = entriesQuery.eq('status', query.status)
    }

    // Filter by date range
    if (query.start_date) {
      entriesQuery = entriesQuery.gte('entry_date', query.start_date)
    }
    if (query.end_date) {
      entriesQuery = entriesQuery.lte('entry_date', query.end_date)
    }

    // Filter by substitute
    if (query.is_substitute === 'true') {
      entriesQuery = entriesQuery.eq('is_substitute', true)
    }

    const { data, error } = await entriesQuery

    if (error) throw error

    return {
      success: true,
      data
    }
  } catch (error: any) {
    console.error('Get time entries error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch time entries'
    })
  }
})
