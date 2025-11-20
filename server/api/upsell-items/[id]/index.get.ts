// GET /api/upsell-items/[id]
// Get a single upsell item by ID

import type { UpsellItem } from '~/types/ticketing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const id = event.context.params?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Item ID is required'
    })
  }

  const { data, error } = await client
    .from('upsell_items')
    .select(`
      *,
      upsell_item_variants(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching upsell item:', error)
    throw createError({
      statusCode: error.code === 'PGRST116' ? 404 : 400,
      message: error.code === 'PGRST116' ? 'Item not found' : error.message
    })
  }

  return {
    success: true,
    item: data as UpsellItem
  }
})
