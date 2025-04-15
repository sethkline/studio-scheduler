// server/api/public/orders/[id].get.ts
import { getSupabaseClient } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    
    // Get order details
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .select(`
        id,
        customer_name,
        email,
        phone,
        total_amount_in_cents,
        payment_method,
        payment_status,
        order_date,
        notes,
        show:recital_show_id (
          id,
          name,
          date,
          start_time,
          location
        )
      `)
      .eq('id', id)
      .single()
    
    if (orderError) throw orderError
    
    // Get tickets
    const { data: tickets, error: ticketsError } = await client
      .from('tickets')
      .select(`
        id,
        ticket_code,
        price_in_cents,
        is_valid,
        has_checked_in,
        check_in_time,
        seat:seat_id (
          id,
          section,
          row_name,
          seat_number,
          seat_type,
          handicap_access
        )
      `)
      .eq('order_id', id)
    
    if (ticketsError) throw ticketsError
    
    return {
      order: order,
      tickets: tickets
    }
  } catch (error) {
    console.error('Get order API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch order'
    })
  }
})