// server/api/payroll/pay-rates/index.get.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)

    let payRatesQuery = client
      .from('teacher_pay_rates')
      .select(`
        *,
        teacher:teachers(id, first_name, last_name, email),
        class_definition:class_definitions(id, name),
        dance_style:dance_styles(id, name)
      `)
      .order('effective_from', { ascending: false })

    // Filter by teacher
    if (query.teacher_id) {
      payRatesQuery = payRatesQuery.eq('teacher_id', query.teacher_id)
    }

    // Filter by current rates only
    if (query.current_only === 'true') {
      const today = new Date().toISOString().split('T')[0]
      payRatesQuery = payRatesQuery
        .lte('effective_from', today)
        .or(`effective_to.is.null,effective_to.gte.${today}`)
    }

    const { data, error } = await payRatesQuery

    if (error) throw error

    return {
      success: true,
      data
    }
  } catch (error: any) {
    console.error('Get pay rates error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch pay rates'
    })
  }
})
