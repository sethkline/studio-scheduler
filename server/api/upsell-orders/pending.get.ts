// GET /api/upsell-orders/pending
// Get pending upsell orders for fulfillment dashboard

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const query = getQuery(event)

  const status = query.status as string | undefined
  const fulfillmentMethod = query.fulfillment_method as string | undefined

  let queryBuilder = client
    .from('upsell_order_items')
    .select(`
      *,
      upsell_item:upsell_items(name, item_type),
      variant:upsell_item_variants(variant_name),
      order:ticket_orders(
        id,
        order_number,
        customer_name,
        customer_email,
        customer_phone
      )
    `)
    .order('created_at', { ascending: false })

  // Apply filters
  if (status) {
    queryBuilder = queryBuilder.eq('fulfillment_status', status)
  } else {
    // Default to non-fulfilled orders
    queryBuilder = queryBuilder.in('fulfillment_status', ['pending', 'processing'])
  }

  if (fulfillmentMethod) {
    queryBuilder = queryBuilder.eq('fulfillment_method', fulfillmentMethod)
  }

  const { data, error } = await queryBuilder

  if (error) {
    console.error('Error fetching pending orders:', error)
    throw createError({
      statusCode: 400,
      message: error.message
    })
  }

  return {
    success: true,
    orders: data
  }
})
