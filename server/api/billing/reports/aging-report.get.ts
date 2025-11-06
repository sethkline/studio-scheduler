/**
 * GET /api/billing/reports/aging-report
 * Get aging report showing outstanding balances by age (30, 60, 90+ days)
 */

import type { AgingReport } from '~/types/billing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()

  // Fetch aging report from the view
  const { data, error } = await client
    .from('aging_report')
    .select('*')
    .order('total_outstanding', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch aging report: ${error.message}`,
    })
  }

  // Calculate totals
  const totals = {
    total_families: data?.length || 0,
    days_0_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    days_90_plus: 0,
    total_outstanding: 0,
  }

  data?.forEach((row: AgingReport) => {
    totals.days_0_30 += row.days_0_30
    totals.days_31_60 += row.days_31_60
    totals.days_61_90 += row.days_61_90
    totals.days_90_plus += row.days_90_plus
    totals.total_outstanding += row.total_outstanding
  })

  return {
    success: true,
    data: data as AgingReport[],
    totals,
  }
})
