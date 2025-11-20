// POST /api/upsell-items/[id]/variants
// Create a new variant for an upsell item

import type { CreateVariantInput, UpsellItemVariant } from '~/types/ticketing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const itemId = event.context.params?.id
  const body = await readBody(event) as Omit<CreateVariantInput, 'upsell_item_id'>

  if (!itemId) {
    throw createError({
      statusCode: 400,
      message: 'Item ID is required'
    })
  }

  // Validate required fields
  if (!body.variant_name || !body.variant_type) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: variant_name, variant_type'
    })
  }

  // Verify item exists
  const { data: item, error: itemError } = await client
    .from('upsell_items')
    .select('id')
    .eq('id', itemId)
    .single()

  if (itemError || !item) {
    throw createError({
      statusCode: 404,
      message: 'Upsell item not found'
    })
  }

  // Create the variant
  const { data, error } = await client
    .from('upsell_item_variants')
    .insert({
      upsell_item_id: itemId,
      variant_name: body.variant_name,
      variant_type: body.variant_type,
      price_override_in_cents: body.price_override_in_cents || null,
      sku: body.sku || null,
      inventory_quantity: body.inventory_quantity || null,
      display_order: body.display_order || 0,
      is_available: true
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating variant:', error)
    throw createError({
      statusCode: 400,
      message: error.message
    })
  }

  return {
    success: true,
    variant: data as UpsellItemVariant
  }
})
