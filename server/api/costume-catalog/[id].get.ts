/**
 * GET /api/costume-catalog/[id]
 *
 * Get detailed information about a specific costume
 */

import { getSupabaseClient } from '~/server/utils/supabase'
import type { CatalogCostume } from '~/types/costume-catalog'

export default defineEventHandler(async (event): Promise<CatalogCostume> => {
  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Costume ID is required'
    })
  }

  const { data, error } = await client
    .from('costumes')
    .select(`
      *,
      vendor:vendors(*),
      sizes:costume_sizes(*),
      colors:costume_colors(*),
      images:costume_images(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError({
        statusCode: 404,
        message: 'Costume not found'
      })
    }
    throw createError({
      statusCode: 500,
      message: `Failed to fetch costume: ${error.message}`
    })
  }

  return data as CatalogCostume
})
