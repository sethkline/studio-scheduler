// server/api/public/orders/[id]/index.get.ts
import { getSupabaseClient } from '../../../../utils/supabase'

/**
 * Public API endpoint to get order details by ID
 * Allows customers to view their order without logging in
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'Order ID is required'
      })
    }

    // Get order details with show, venue, and tickets
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        total_amount_in_cents,
        status,
        order_number,
        notes,
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
            state,
            zip_code
          )
        ),
        tickets (
          id,
          ticket_number,
          qr_code,
          pdf_url,
          pdf_generated_at,
          scanned_at,
          created_at,
          show_seat_id,
          show_seats:show_seat_id (
            id,
            price_in_cents,
            status,
            seat_id,
            seats:seat_id (
              id,
              row_name,
              seat_number,
              seat_type,
              section_id,
              venue_sections:section_id (
                id,
                name
              )
            )
          )
        )
      `)
      .eq('id', id)
      .single()

    if (orderError) {
      console.error('Error fetching order:', orderError)
      throw createError({
        statusCode: orderError.code === 'PGRST116' ? 404 : 500,
        message: orderError.code === 'PGRST116' ? 'Order not found' : 'Failed to fetch order'
      })
    }

    // Format response
    const show = order.recital_shows
    const venue = show?.venues

    const formattedOrder = {
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      totalAmount: order.total_amount_in_cents,
      status: order.status,
      notes: order.notes,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      show: show ? {
        id: show.id,
        name: show.name,
        date: show.date,
        time: show.start_time,
        venue: venue ? {
          id: venue.id,
          name: venue.name,
          address: venue.address,
          city: venue.city,
          state: venue.state,
          zipCode: venue.zip_code
        } : null
      } : null,
      tickets: order.tickets?.map(ticket => {
        const showSeat = ticket.show_seats
        const seat = showSeat?.seats
        const section = seat?.venue_sections

        return {
          id: ticket.id,
          ticketNumber: ticket.ticket_number,
          qrCode: ticket.qr_code,
          pdfUrl: ticket.pdf_url,
          pdfGeneratedAt: ticket.pdf_generated_at,
          scannedAt: ticket.scanned_at,
          createdAt: ticket.created_at,
          price: showSeat?.price_in_cents || 0,
          seatStatus: showSeat?.status,
          seat: seat ? {
            id: seat.id,
            section: section?.name || 'General',
            sectionId: section?.id,
            row: seat.row_name,
            number: seat.seat_number,
            type: seat.seat_type
          } : null
        }
      }) || []
    }

    return {
      success: true,
      data: formattedOrder
    }
  } catch (error: any) {
    console.error('Get order API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch order'
    })
  }
})