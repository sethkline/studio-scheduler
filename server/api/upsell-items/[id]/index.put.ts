// PUT /api/upsell-items/[id]
// Update an upsell item

import type { UpdateUpsellItemInput, UpsellItem } from '~/types/ticketing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const id = event.context.params?.id
  const body = await readBody(event) as UpdateUpsellItemInput

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Item ID is required'
    })
  }

  // Build update object (only include fields that were provided)
  const updateData: Record<string, any> = {}

  if (body.name !== undefined) updateData.name = body.name
  if (body.description !== undefined) updateData.description = body.description
  if (body.item_type !== undefined) updateData.item_type = body.item_type
  if (body.price_in_cents !== undefined) {
    if (body.price_in_cents < 0) {
      throw createError({
        statusCode: 400,
        message: 'Price must be non-negative'
      })
    }
    updateData.price_in_cents = body.price_in_cents
  }
  if (body.inventory_quantity !== undefined) updateData.inventory_quantity = body.inventory_quantity
  if (body.max_quantity_per_order !== undefined) updateData.max_quantity_per_order = body.max_quantity_per_order
  if (body.image_url !== undefined) updateData.image_url = body.image_url
  if (body.available_from !== undefined) updateData.available_from = body.available_from
  if (body.available_until !== undefined) updateData.available_until = body.available_until
  if (body.is_active !== undefined) updateData.is_active = body.is_active
  if (body.display_order !== undefined) updateData.display_order = body.display_order

  // Update the item
  const { data, error } = await client
    .from('upsell_items')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      upsell_item_variants(*)
    `)
    .single()

  if (error) {
    console.error('Error updating upsell item:', error)
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
