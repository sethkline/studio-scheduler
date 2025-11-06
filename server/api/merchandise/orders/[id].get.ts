import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')

    if (!id) {
      return createError({
        statusCode: 400,
        statusMessage: 'Order ID is required'
      })
    }

    // Get the order with items
    const { data: order, error: orderError } = await client
      .from('merchandise_orders')
      .select(`
        *,
        items:merchandise_order_items(
          *,
          variant:merchandise_variants(
            *,
            product:merchandise_products(*)
          )
        )
      `)
      .eq('id', id)
      .single()

    if (orderError) throw orderError

    if (!order) {
      return createError({
        statusCode: 404,
        statusMessage: 'Order not found'
      })
    }

    return order
  } catch (error) {
    console.error('Get order API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch order'
    })
  }
})
