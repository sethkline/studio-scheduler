// server/api/public/tickets/[code].get.ts
import { getSupabaseClient } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const code = getRouterParam(event, 'code')
    
    // Get ticket details
    const { data: ticket, error: ticketError } = await client
      .from('tickets')
      .select(`
        id,
        ticket_code,
        price_in_cents,
        is_valid,
        has_checked_in,
        check_in_time,
        order:order_id (
          id,
          customer_name,
          email,
          payment_status
        ),
        seat:seat_id (
          id,
          section,
          row_name,
          seat_number,
          seat_type,
          handicap_access,
          show:recital_show_id (
            id,
            name,
            date,
            start_time,
            location
          )
        )
      `)
      .eq('ticket_code', code)
      .single()
    
    if (ticketError) throw ticketError
    
    // Check if payment is completed
    if (ticket.order.payment_status !== 'completed') {
      return createError({
        statusCode: 400,
        statusMessage: 'Payment for this ticket has not been completed'
      })
    }
    
    return {
      ticket: ticket
    }
  } catch (error) {
    console.error('Get ticket API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch ticket'
    })
  }
})