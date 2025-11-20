// GET /api/analytics/upsells
// Get upsell analytics and performance metrics

import type { UpsellAnalytics } from '~/types/ticketing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const query = getQuery(event)

  const seriesId = query.series_id as string | undefined
  const showId = query.show_id as string | undefined

  // Get total upsell revenue
  let revenueQuery = client
    .from('upsell_order_items')
    .select('total_price_in_cents, order_id, upsell_item_id, upsell_item:upsell_items(name, item_type)')

  // Filter by show/series if provided
  if (showId || seriesId) {
    revenueQuery = revenueQuery
      .select('total_price_in_cents, order_id, upsell_item_id, upsell_item:upsell_items(name, item_type, recital_show_id, recital_series_id)')

    if (showId) {
      revenueQuery = revenueQuery.eq('upsell_item.recital_show_id', showId)
    } else if (seriesId) {
      revenueQuery = revenueQuery.eq('upsell_item.recital_series_id', seriesId)
    }
  }

  const { data: orderItems, error: orderError } = await revenueQuery

  if (orderError) {
    console.error('Error fetching order items:', orderError)
    throw createError({
      statusCode: 400,
      message: orderError.message
    })
  }

  // Calculate total revenue
  const totalRevenue = orderItems?.reduce((sum, item) => sum + item.total_price_in_cents, 0) || 0

  // Get total orders and orders with upsells
  let ordersQuery = client
    .from('ticket_orders')
    .select('id')

  // Note: This is a simplified query. In a real implementation, you'd need to
  // filter orders by show/series through joins
  const { data: allOrders } = await ordersQuery

  const totalOrders = allOrders?.length || 0

  // Get unique orders with upsells
  const ordersWithUpsells = new Set(orderItems?.map(item => item.order_id)).size

  // Calculate attach rate
  const attachRate = totalOrders > 0 ? (ordersWithUpsells / totalOrders) * 100 : 0

  // Get top product
  const productSales: Record<string, number> = {}
  orderItems?.forEach(item => {
    const productName = item.upsell_item?.name || 'Unknown'
    productSales[productName] = (productSales[productName] || 0) + 1
  })

  let topProduct = null
  let maxSales = 0
  Object.entries(productSales).forEach(([name, count]) => {
    if (count > maxSales) {
      maxSales = count
      topProduct = name
    }
  })

  // Get products by type
  const productsByType: Record<string, { count: number; revenue_in_cents: number }> = {}
  orderItems?.forEach(item => {
    const type = item.upsell_item?.item_type || 'unknown'
    if (!productsByType[type]) {
      productsByType[type] = { count: 0, revenue_in_cents: 0 }
    }
    productsByType[type].count += 1
    productsByType[type].revenue_in_cents += item.total_price_in_cents
  })

  // Get pending fulfillment count
  const { data: pendingItems, error: pendingError } = await client
    .from('upsell_order_items')
    .select('id')
    .eq('fulfillment_status', 'pending')

  const pendingCount = pendingItems?.length || 0

  const analytics: UpsellAnalytics = {
    total_revenue_in_cents: totalRevenue,
    total_orders: totalOrders,
    orders_with_upsells: ordersWithUpsells,
    attach_rate: Math.round(attachRate * 10) / 10, // Round to 1 decimal
    top_product: topProduct,
    pending_count: pendingCount,
    products_by_type: productsByType
  }

  return {
    success: true,
    analytics
  }
})
