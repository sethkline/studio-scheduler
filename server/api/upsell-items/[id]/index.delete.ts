// DELETE /api/upsell-items/[id]
// Delete an upsell item

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const id = event.context.params?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Item ID is required'
    })
  }

  // Check if item exists and has any orders
  const { data: orderItems, error: checkError } = await client
    .from('upsell_order_items')
    .select('id')
    .eq('upsell_item_id', id)
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
      message: 'Cannot delete item with existing orders. Consider marking it as inactive instead.'
    })
  }

  // Delete the item (variants will be cascaded)
  const { error } = await client
    .from('upsell_items')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting upsell item:', error)
    throw createError({
      statusCode: error.code === 'PGRST116' ? 404 : 400,
      message: error.code === 'PGRST116' ? 'Item not found' : error.message
    })
  }

  return {
    success: true,
    message: 'Item deleted successfully'
  }
})
