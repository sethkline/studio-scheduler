// DELETE /api/upsell-items/[id]/variants/[variantId]
// Delete a variant

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const itemId = event.context.params?.id
  const variantId = event.context.params?.variantId

  if (!itemId || !variantId) {
    throw createError({
      statusCode: 400,
      message: 'Item ID and Variant ID are required'
    })
  }

  // Check if variant has any orders
  const { data: orderItems, error: checkError } = await client
    .from('upsell_order_items')
    .select('id')
    .eq('variant_id', variantId)
    .limit(1)

  if (checkError) {
    console.error('Error checking for orders:', checkError)
    throw createError({
      statusCode: 400,
      message: checkError.message
    })
  }

  if (orderItems && orderItems.length > 0) {
    throw createError({
      statusCode: 400,
      message: 'Cannot delete variant with existing orders. Consider marking it as unavailable instead.'
    })
  }

  // Delete the variant
  const { error } = await client
    .from('upsell_item_variants')
    .delete()
    .eq('id', variantId)
    .eq('upsell_item_id', itemId)

  if (error) {
    console.error('Error deleting variant:', error)
    throw createError({
      statusCode: error.code === 'PGRST116' ? 404 : 400,
      message: error.code === 'PGRST116' ? 'Variant not found' : error.message
    })
  }

  return {
    success: true,
    message: 'Variant deleted successfully'
  }
})
