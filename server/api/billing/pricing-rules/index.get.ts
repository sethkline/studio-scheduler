/**
 * GET /api/billing/pricing-rules
 * List all pricing rules (discounts) with optional filtering
 */

import type { PricingRule } from '~/types/billing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const query = getQuery(event)

  // Build query with optional filters
  let supabaseQuery = client
    .from('pricing_rules')
    .select('*')
    .order('created_at', { ascending: false })

  // Filter by active status
  if (query.is_active !== undefined) {
    supabaseQuery = supabaseQuery.eq('is_active', query.is_active === 'true')
  }

  // Filter by discount scope
  if (query.discount_scope) {
    supabaseQuery = supabaseQuery.eq('discount_scope', query.discount_scope)
  }

  // Filter by valid date range
  if (query.valid_date) {
    supabaseQuery = supabaseQuery
      .or(`valid_from.is.null,valid_from.lte.${query.valid_date}`)
      .or(`valid_to.is.null,valid_to.gte.${query.valid_date}`)
  }

  const { data, error } = await supabaseQuery

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch pricing rules: ${error.message}`,
    })
  }

  return {
    success: true,
    data: data as PricingRule[],
    count: data?.length || 0,
  }
})
