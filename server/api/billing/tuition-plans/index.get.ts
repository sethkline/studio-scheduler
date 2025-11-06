/**
 * GET /api/billing/tuition-plans
 * List all tuition plans with optional filtering
 */

import type { TuitionPlan } from '~/types/billing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const query = getQuery(event)

  // Build query with optional filters
  let supabaseQuery = client
    .from('tuition_plans')
    .select(`
      *,
      class_definition:class_definitions(id, name),
      class_level:class_levels(id, name),
      dance_style:dance_styles(id, name, color)
    `)
    .order('created_at', { ascending: false })

  // Filter by active status
  if (query.is_active !== undefined) {
    supabaseQuery = supabaseQuery.eq('is_active', query.is_active === 'true')
  }

  // Filter by plan type
  if (query.plan_type) {
    supabaseQuery = supabaseQuery.eq('plan_type', query.plan_type)
  }

  // Filter by class definition
  if (query.class_definition_id) {
    supabaseQuery = supabaseQuery.eq('class_definition_id', query.class_definition_id)
  }

  // Filter by effective date
  if (query.effective_date) {
    supabaseQuery = supabaseQuery
      .lte('effective_from', query.effective_date)
      .or(`effective_to.is.null,effective_to.gte.${query.effective_date}`)
  }

  const { data, error } = await supabaseQuery

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch tuition plans: ${error.message}`,
    })
  }

  return {
    success: true,
    data: data as TuitionPlan[],
    count: data?.length || 0,
  }
})
