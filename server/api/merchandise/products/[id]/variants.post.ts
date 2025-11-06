import { getSupabaseClient } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const productId = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!productId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Product ID is required'
      })
    }

    // Create the variant
    const { data: variant, error: variantError } = await client
      .from('merchandise_variants')
      .insert({
        product_id: productId,
        sku: body.sku,
        size: body.size,
        color: body.color,
        price_adjustment_in_cents: body.price_adjustment_in_cents || 0,
        is_available: body.is_available !== undefined ? body.is_available : true
      })
      .select()
      .single()

    if (variantError) throw variantError

    // Create inventory record for the variant
    const { data: inventory, error: inventoryError } = await client
      .from('merchandise_inventory')
      .insert({
        variant_id: variant.id,
        quantity_on_hand: body.quantity_on_hand || 0,
        quantity_reserved: 0,
        low_stock_threshold: body.low_stock_threshold || 5
      })
      .select()
      .single()

    if (inventoryError) throw inventoryError

    return {
      variant: {
        ...variant,
        inventory
      }
    }
  } catch (error) {
    console.error('Create variant API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create variant'
    })
  }
})
