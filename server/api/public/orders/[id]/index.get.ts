// server/api/public/orders/[id]/index.get.ts
/**
 * PUBLIC API - Get Order Details
 *
 * SECURITY: Requires customer_email verification to prevent unauthorized access
 * Uses RLS-aware client for proper access control
 *
 * Query params required:
 * - email: Customer email (must match order)
 */

export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'id')
  const query = getQuery(event)

  if (!orderId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Order ID is required'
    })
  }

  // SECURITY: Require email verification to access order
  if (!query.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email is required for verification'
    })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(query.email as string)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid email format'
    })
  }

  try {
    // Use RLS-aware client (respects row-level security policies)
    const client = await serverSupabaseClient(event)

    // Get order details with email verification
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        customer_phone,
        total_amount_in_cents,
        status,
        created_at,
        notes,
        show:recital_shows!ticket_orders_show_id_fkey (
          id,
          title,
          show_date,
          show_time,
          venue:venues (
            id,
            name,
            address,
            city,
            state
          )
        )
      `)
      .eq('id', orderId)
      .eq('customer_email', query.email)
      .maybeSingle()

    if (orderError) {
      console.error('Order fetch error:', orderError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch order'
      })
    }

    // Order not found or email doesn't match
    if (!order) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order not found or email does not match'
      })
    }

    // Get tickets for this order
    const { data: tickets, error: ticketsError } = await client
      .from('tickets')
      .select(`
        id,
        ticket_number,
        qr_code,
        pdf_url,
        scanned_at,
        created_at,
        show_seat:show_seats!tickets_show_seat_id_fkey (
          id,
          price_in_cents,
          seat:seats (
            id,
            row_name,
            seat_number,
            seat_type,
            section:venue_sections (
              id,
              name
            )
          )
        )
      `)
      .eq('ticket_order_id', orderId)

    if (ticketsError) {
      console.error('Tickets fetch error:', ticketsError)
      // Don't fail the whole request if tickets fail
      return {
        order,
        tickets: []
      }
    }

    return {
      order,
      tickets: tickets || []
    }
  } catch (error: any) {
    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error
    }

    console.error('Get order API error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch order'
    })
  }
})