/**
 * GET /api/billing/family-discounts
 * List family discounts with optional filtering
 */

import type { FamilyDiscount } from '~/types/billing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const query = getQuery(event)

  // Build query
  let supabaseQuery = client
    .from('family_discounts')
    .select(`
      *,
      student:students(id, first_name, last_name),
      pricing_rule:pricing_rules(id, name, discount_type, discount_percentage, discount_amount)
    `)
    .order('created_at', { ascending: false })

  // Filter by student
  if (query.student_id) {
    supabaseQuery = supabaseQuery.eq('student_id', query.student_id)
  }

  // Filter by active status
  if (query.is_active !== undefined) {
    supabaseQuery = supabaseQuery.eq('is_active', query.is_active === 'true')
  }

  // Filter by scholarship status
  if (query.is_scholarship !== undefined) {
    supabaseQuery = supabaseQuery.eq('is_scholarship', query.is_scholarship === 'true')
  }

  // Filter by valid date
  if (query.valid_date) {
    supabaseQuery = supabaseQuery
      .lte('valid_from', query.valid_date)
      .or(`valid_to.is.null,valid_to.gte.${query.valid_date}`)
  }

  const { data, error } = await supabaseQuery

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch family discounts: ${error.message}`,
    })
  }

  return {
    success: true,
    data: data as FamilyDiscount[],
    count: data?.length || 0,
  }
})
