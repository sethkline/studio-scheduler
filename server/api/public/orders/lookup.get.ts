// server/api/public/orders/lookup.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)
    
    // Validate required fields
    if (!query.email) {
      return createError({
        statusCode: 400,
        statusMessage: 'Email is required'
      })
    }
    
    // Get orders by email
    const { data: orders, error: ordersError } = await client
      .from('ticket_orders')
      .select(`
        id,
        customer_name,
        email,
        total_amount_in_cents,
        payment_status,
        order_date,
        show:recital_show_id (
          id,
          name,
          date,
          start_time
        )
      `)
      .eq('email', query.email)
      .order('order_date', { ascending: false })
    
    if (ordersError) throw ordersError
    
    return {
      orders: orders
    }
  } catch (error) {
    console.error('Lookup orders API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to lookup orders'
    })
  }
})