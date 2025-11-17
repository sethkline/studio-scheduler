// server/api/public/orders/lookup.get.ts
import { getSupabaseClient } from '../../../utils/supabase'

/**
 * Public API endpoint to lookup ticket orders by email
 * Allows customers to find their orders without logging in
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)

    // Validate required fields
    if (!query.email) {
      throw createError({
        statusCode: 400,
        message: 'Email is required'
      })
    }

    const email = query.email as string

    // Get orders by email with show and venue details
    const { data: orders, error: ordersError } = await client
      .from('ticket_orders')
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        total_amount_in_cents,
        status,
        order_number,
        created_at,
        updated_at,
        show_id,
        recital_shows:show_id (
          id,
          name,
          date,
          start_time,
          venue_id,
          venues:venue_id (
            id,
            name,
            address,
            city,
            state
          )
        )
      `)
      .eq('customer_email', email)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch orders'
      })
    }

    // Format response
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      totalAmount: order.total_amount_in_cents,
      status: order.status,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      show: order.recital_shows ? {
        id: order.recital_shows.id,
        name: order.recital_shows.name,
        date: order.recital_shows.date,
        time: order.recital_shows.start_time,
        venue: order.recital_shows.venues ? {
          id: order.recital_shows.venues.id,
          name: order.recital_shows.venues.name,
          address: order.recital_shows.venues.address,
          city: order.recital_shows.venues.city,
          state: order.recital_shows.venues.state
        } : null
      } : null
    }))

    return {
      success: true,
      data: {
        orders: formattedOrders,
        count: formattedOrders.length
      }
    }
  } catch (error: any) {
    console.error('Lookup orders API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to lookup orders'
    })
  }
})