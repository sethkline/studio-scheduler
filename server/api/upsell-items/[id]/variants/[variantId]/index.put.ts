// PUT /api/upsell-items/[id]/variants/[variantId]
// Update a variant

import type { UpdateVariantInput, UpsellItemVariant } from '~/types/ticketing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const itemId = event.context.params?.id
  const variantId = event.context.params?.variantId
  const body = await readBody(event) as UpdateVariantInput

  if (!itemId || !variantId) {
    throw createError({
      statusCode: 400,
      message: 'Item ID and Variant ID are required'
    })
  }

  // Build update object
  const updateData: Record<string, any> = {}

  if (body.variant_name !== undefined) updateData.variant_name = body.variant_name
  if (body.variant_type !== undefined) updateData.variant_type = body.variant_type
  if (body.price_override_in_cents !== undefined) updateData.price_override_in_cents = body.price_override_in_cents
  if (body.sku !== undefined) updateData.sku = body.sku
  if (body.inventory_quantity !== undefined) updateData.inventory_quantity = body.inventory_quantity
  if (body.is_available !== undefined) updateData.is_available = body.is_available
  if (body.display_order !== undefined) updateData.display_order = body.display_order

  // Update the variant
  const { data, error } = await client
    .from('upsell_item_variants')
    .update(updateData)
    .eq('id', variantId)
    .eq('upsell_item_id', itemId) // Ensure variant belongs to the item
    .select()
    .single()

  if (error) {
    console.error('Error updating variant:', error)
    throw createError({
      statusCode: error.code === 'PGRST116' ? 404 : 400,
      message: error.code === 'PGRST116' ? 'Variant not found' : error.message
    })
  }

  return {
    success: true,
    variant: data as UpsellItemVariant
  }
})
