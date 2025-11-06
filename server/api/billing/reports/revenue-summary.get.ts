/**
 * GET /api/billing/reports/revenue-summary
 * Get revenue summary with monthly breakdown
 */

import type { RevenueSummary } from '~/types/billing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const query = getQuery(event)

  // Get date range
  const startDate = query.start_date as string || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  const endDate = query.end_date as string || new Date().toISOString().split('T')[0]

  // Fetch revenue from the view
  const { data, error } = await client
    .from('revenue_summary')
    .select('*')
    .gte('month', startDate)
    .lte('month', endDate)
    .order('month', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch revenue summary: ${error.message}`,
    })
  }

  // Calculate totals
  const totals = {
    total_revenue: 0,
    total_payments: 0,
    card_revenue: 0,
    cash_revenue: 0,
    check_revenue: 0,
  }

  data?.forEach((row: RevenueSummary) => {
    totals.total_revenue += row.total_revenue
    totals.total_payments += row.payment_count
    totals.card_revenue += row.card_revenue
    totals.cash_revenue += row.cash_revenue
    totals.check_revenue += row.check_revenue
  })

  return {
    success: true,
    data: data as RevenueSummary[],
    totals,
  }
})
