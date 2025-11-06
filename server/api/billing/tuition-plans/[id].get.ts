/**
 * GET /api/billing/tuition-plans/[id]
 * Get a specific tuition plan by ID
 */

import type { TuitionPlan } from '~/types/billing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Tuition plan ID is required',
    })
  }

  const { data, error } = await client
    .from('tuition_plans')
    .select(`
      *,
      class_definition:class_definitions(id, name),
      class_level:class_levels(id, name),
      dance_style:dance_styles(id, name, color)
    `)
    .eq('id', id)
    .single()

  if (error) {
    throw createError({
      statusCode: error.code === 'PGRST116' ? 404 : 500,
      message: error.code === 'PGRST116' ? 'Tuition plan not found' : `Failed to fetch tuition plan: ${error.message}`,
    })
  }

  return {
    success: true,
    data: data as TuitionPlan,
  }
})
