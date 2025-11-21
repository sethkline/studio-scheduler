/**
 * GET /api/costume-catalog/assignments/[performanceId]
 *
 * Get all costume assignments for a specific performance
 */

import { getSupabaseClient } from '~/server/utils/supabase'
import type { PerformanceCostume } from '~/types/costume-catalog'

export default defineEventHandler(async (event): Promise<PerformanceCostume[]> => {
  const client = getSupabaseClient()
  const performanceId = getRouterParam(event, 'performanceId')

  if (!performanceId) {
    throw createError({
      statusCode: 400,
      message: 'Performance ID is required'
    })
  }

  const { data, error } = await client
    .from('performance_costumes')
    .select(`
      *,
      costume:costumes(
        *,
        vendor:vendors(*),
        sizes:costume_sizes(*),
        colors:costume_colors(*),
        images:costume_images(*)
      ),
      order_details:costume_order_details(
        *,
        size:costume_sizes(*),
        color:costume_colors(*)
      )
    `)
    .eq('performance_id', performanceId)
    .order('is_primary', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch costume assignments: ${error.message}`
    })
  }

  return data as PerformanceCostume[]
})
