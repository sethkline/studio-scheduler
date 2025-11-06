import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)

    // Parse query parameters for pagination
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 50
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Filter parameters
    const user_id = query.user_id as string
    const email = query.email as string
    const payment_status = query.payment_status as string
    const order_status = query.order_status as string
    const start_date = query.start_date as string
    const end_date = query.end_date as string
    const sort_by = (query.sort_by as string) || 'order_date'
    const sort_direction = (query.sort_direction as string) || 'desc'

    // Build the query
    let ordersQuery = client
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
      `, { count: 'exact' })

    // Apply filters
    if (user_id) {
      ordersQuery = ordersQuery.eq('user_id', user_id)
    }

    if (email) {
      ordersQuery = ordersQuery.eq('email', email)
    }

    if (payment_status) {
      ordersQuery = ordersQuery.eq('payment_status', payment_status)
    }

    if (order_status) {
      ordersQuery = ordersQuery.eq('order_status', order_status)
    }

    if (start_date) {
      ordersQuery = ordersQuery.gte('order_date', start_date)
    }

    if (end_date) {
      ordersQuery = ordersQuery.lte('order_date', end_date)
    }

    // Apply sorting
    const ascending = sort_direction === 'asc'
    ordersQuery = ordersQuery.order(sort_by, { ascending })

    // Apply pagination
    const { data, count, error } = await ordersQuery
      .range(from, to)

    if (error) throw error

    return {
      orders: data,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  } catch (error) {
    console.error('Get orders API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch orders'
    })
  }
})
