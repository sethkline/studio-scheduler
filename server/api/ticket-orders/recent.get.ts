import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)
    const limit = parseInt(query.limit as string) || 5

    // Fetch recent orders
    const { data: orders, error } = await client
      .from('ticket_orders')
      .select(`
        id,
        customer_email,
        customer_first_name,
        customer_last_name,
        total_amount_cents,
        created_at,
        status
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    // For each order, count tickets
    const ordersWithTickets = await Promise.all(
      (orders || []).map(async (order) => {
        const { count: ticketCount, error: countError } = await client
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('order_id', order.id)

        return {
          ...order,
          ticket_count: ticketCount || 0
        }
      })
    )

    return ordersWithTickets
  } catch (error) {
    console.error('Recent orders API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch recent orders'
    })
  }
})
