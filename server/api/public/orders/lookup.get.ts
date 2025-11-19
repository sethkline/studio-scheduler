// server/api/public/orders/lookup.get.ts
import { serverSupabaseClient } from '#supabase/server'

/**
 * SECURITY FIX: Public API endpoint to lookup ticket orders
 *
 * REQUIRES PROOF OF OWNERSHIP:
 * - Email + Order Number (both required)
 *
 * This prevents email enumeration attacks where an attacker could:
 * 1. Try random emails to discover who has purchased tickets
 * 2. Scrape customer PII (names, phone numbers, show attendance)
 *
 * By requiring the order number (which is only known to the customer),
 * we ensure the requester actually owns/knows about the specific order.
 */
export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event)
    const query = getQuery(event)

    // SECURITY: Require BOTH email AND order_number to prove ownership
    if (!query.email || !query.order_number) {
      throw createError({
        statusCode: 400,
        message: 'Both email and order number are required'
      })
    }

    const email = query.email as string
    const orderNumber = query.order_number as string

    // Get specific order by BOTH email AND order_number
    // This prevents email enumeration attacks
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .select(`
        id,
        order_number,
        customer_name,
        total_amount_in_cents,
        status,
        created_at,
        show:recital_shows!ticket_orders_show_id_fkey (
          id,
          title,
          show_date,
          show_time,
          venue:venues (
            id,
            name,
            city,
            state
          )
        ),
        tickets (
          id,
          ticket_number,
          qr_code,
          pdf_url,
          show_seat:show_seats (
            seat:seats (
              row_name,
              seat_number,
              section:venue_sections (
                name
              )
            )
          )
        )
      `)
      .eq('customer_email', email)
      .eq('order_number', orderNumber)
      .maybeSingle()

    if (orderError) {
      console.error('Error fetching order:', orderError)
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch order'
      })
    }

    // Don't reveal whether email exists - return same error for both cases
    if (!order) {
      throw createError({
        statusCode: 404,
        message: 'Order not found'
      })
    }

    // SECURITY: Only return minimal, necessary information
    // Do NOT include: customer_phone, customer_email (already know it), detailed venue address
    const showData = order.show as any
    const formattedOrder = {
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name, // OK - they already know this
      totalAmount: order.total_amount_in_cents,
      status: order.status,
      createdAt: order.created_at,
      show: showData ? {
        id: showData.id,
        title: showData.title,
        date: showData.show_date,
        time: showData.show_time,
        venue: showData.venue ? {
          name: showData.venue.name,
          city: showData.venue.city,
          state: showData.venue.state
          // SECURITY: No detailed address to prevent stalking/harassment
        } : null
      } : null,
      tickets: order.tickets?.map((ticket: any) => ({
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        qrCode: ticket.qr_code,
        pdfUrl: ticket.pdf_url,
        seat: ticket.show_seat?.seat ? {
          section: ticket.show_seat.seat.section?.name,
          row: ticket.show_seat.seat.row_name,
          number: ticket.show_seat.seat.seat_number
        } : null
      })) || []
    }

    return {
      success: true,
      data: formattedOrder
    }
  } catch (error: any) {
    console.error('Lookup order API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to lookup order'
    })
  }
})
