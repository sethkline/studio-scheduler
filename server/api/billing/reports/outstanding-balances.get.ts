/**
 * GET /api/billing/reports/outstanding-balances
 * Get outstanding balances by family
 */

import type { OutstandingBalance } from '~/types/billing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()

  // Fetch outstanding balances from the view
  const { data, error } = await client
    .from('outstanding_balances')
    .select('*')
    .order('total_outstanding', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch outstanding balances: ${error.message}`,
    })
  }

  // Calculate totals
  const totals = {
    total_families: data?.length || 0,
    total_outstanding: 0,
    total_overdue: 0,
    total_invoices: 0,
  }

  data?.forEach((row: OutstandingBalance) => {
    totals.total_outstanding += row.total_outstanding
    totals.total_overdue += row.overdue_amount
    totals.total_invoices += row.invoice_count
  })

  return {
    success: true,
    data: data as OutstandingBalance[],
    totals,
  }
})
