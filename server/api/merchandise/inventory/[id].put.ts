import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const variantId = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!variantId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Variant ID is required'
      })
    }

    // Build update object
    const updates: any = {}

    if (body.quantity_on_hand !== undefined) updates.quantity_on_hand = body.quantity_on_hand
    if (body.quantity_reserved !== undefined) updates.quantity_reserved = body.quantity_reserved
    if (body.low_stock_threshold !== undefined) updates.low_stock_threshold = body.low_stock_threshold

    // Update inventory
    const { data: inventory, error } = await client
      .from('merchandise_inventory')
      .update(updates)
      .eq('variant_id', variantId)
      .select()
      .single()

    if (error) throw error

    if (!inventory) {
      return createError({
        statusCode: 404,
        statusMessage: 'Inventory record not found'
      })
    }

    return { inventory }
  } catch (error) {
    console.error('Update inventory API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update inventory'
    })
  }
})
