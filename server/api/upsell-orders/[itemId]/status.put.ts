// PUT /api/upsell-orders/[itemId]/status
// Update fulfillment status of an upsell order item

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const itemId = event.context.params?.itemId
  const body = await readBody(event)

  if (!itemId) {
    throw createError({
      statusCode: 400,
      message: 'Item ID is required'
    })
  }

  const { status, tracking_number } = body

  if (!status) {
    throw createError({
      statusCode: 400,
      message: 'Status is required'
    })
  }

  // Validate status
  const validStatuses = ['pending', 'processing', 'fulfilled', 'cancelled']
  if (!validStatuses.includes(status)) {
    throw createError({
      statusCode: 400,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    })
  }

  // Update the item
  const updateData: Record<string, any> = {
    fulfillment_status: status
  }

  if (tracking_number) {
    updateData.tracking_number = tracking_number
  }

  const { data, error } = await client
    .from('upsell_order_items')
    .update(updateData)
    .eq('id', itemId)
    .select(`
      *,
      upsell_item:upsell_items(name),
      order:ticket_orders(customer_name, customer_email)
    `)
    .single()

  if (error) {
    console.error('Error updating status:', error)
    throw createError({
      statusCode: 400,
      message: error.message
    })
  }

  // TODO: Send email notification if status changed to fulfilled
  // if (status === 'fulfilled' && data.order) {
  //   await sendFulfillmentEmail(data.order.customer_email, {
  //     customer_name: data.order.customer_name,
  //     product_name: data.upsell_item.name,
  //     tracking_number: tracking_number
  //   })
  // }

  return {
    success: true,
    item: data
  }
})
