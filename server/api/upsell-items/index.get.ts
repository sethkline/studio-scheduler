// GET /api/upsell-items
// List all upsell items with optional filtering

import type { UpsellItem } from '~/types/ticketing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const query = getQuery(event)

  const showId = query.show_id as string | undefined
  const seriesId = query.series_id as string | undefined
  const itemType = query.item_type as string | undefined
  const isActive = query.is_active !== undefined ? query.is_active === 'true' : undefined

  let queryBuilder = client
    .from('upsell_items')
    .select(`
      *,
      upsell_item_variants(*)
    `)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  // Apply filters
  if (showId) {
    queryBuilder = queryBuilder.eq('recital_show_id', showId)
  }

  if (seriesId) {
    queryBuilder = queryBuilder.eq('recital_series_id', seriesId)
  }

  if (itemType) {
    queryBuilder = queryBuilder.eq('item_type', itemType)
  }

  if (isActive !== undefined) {
    queryBuilder = queryBuilder.eq('is_active', isActive)
  }

  const { data, error } = await queryBuilder

  if (error) {
    console.error('Error fetching upsell items:', error)
    throw createError({
      statusCode: 400,
      message: error.message
    })
  }

  return {
    success: true,
    items: data as UpsellItem[]
  }
})
