// POST /api/upsell-items
// Create a new upsell item

import type { CreateUpsellItemInput, UpsellItem } from '~/types/ticketing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody(event) as CreateUpsellItemInput

  // Validate required fields
  if (!body.name || !body.item_type || body.price_in_cents === undefined) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: name, item_type, price_in_cents'
    })
  }

  // Validate price is non-negative
  if (body.price_in_cents < 0) {
    throw createError({
      statusCode: 400,
      message: 'Price must be non-negative'
    })
  }

  // Extract variants from body
  const variants = body.variants || []

  // Create the upsell item
  const { data: item, error: itemError } = await client
    .from('upsell_items')
    .insert({
      recital_series_id: body.recital_series_id || null,
      recital_show_id: body.recital_show_id || null,
      name: body.name,
      description: body.description || null,
      item_type: body.item_type,
      price_in_cents: body.price_in_cents,
      inventory_quantity: body.inventory_quantity || null,
      max_quantity_per_order: body.max_quantity_per_order || 10,
      image_url: body.image_url || null,
      available_from: body.available_from || null,
      available_until: body.available_until || null,
      is_active: body.is_active !== undefined ? body.is_active : true,
      display_order: body.display_order || 0
    })
    .select()
    .single()

  if (itemError) {
    console.error('Error creating upsell item:', itemError)
    throw createError({
      statusCode: 400,
      message: itemError.message
    })
  }

  // Create variants if provided
  if (variants.length > 0) {
    const variantData = variants.map((v) => ({
      upsell_item_id: item.id,
      variant_name: v.variant_name,
      variant_type: v.variant_type,
      price_override_in_cents: v.price_override_in_cents || null,
      sku: v.sku || null,
      inventory_quantity: v.inventory_quantity || null,
      display_order: v.display_order || 0,
      is_available: true
    }))

    const { error: variantsError } = await client
      .from('upsell_item_variants')
      .insert(variantData)

    if (variantsError) {
      console.error('Error creating variants:', variantsError)
      // Note: Item was created, but variants failed
      // Could rollback item here, but for now just log the error
    }
  }

  // Fetch the complete item with variants
  const { data: completeItem, error: fetchError } = await client
    .from('upsell_items')
    .select(`
      *,
      upsell_item_variants(*)
    `)
    .eq('id', item.id)
    .single()

  if (fetchError) {
    console.error('Error fetching complete item:', fetchError)
    // Return basic item even if fetch fails
    return {
      success: true,
      item: item as UpsellItem
    }
  }

  return {
    success: true,
    item: completeItem as UpsellItem
  }
})
