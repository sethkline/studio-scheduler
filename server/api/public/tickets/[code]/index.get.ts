// server/api/public/tickets/[code]/index.get.ts
/**
 * PUBLIC API - Get Ticket by Code
 *
 * SECURITY: ticket_code acts as authentication token (like QR code)
 * Uses service client because RLS may not allow anonymous access to tickets
 * NOTE: This is acceptable as ticket_code is a secret that proves ownership
 */

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ticket code is required'
    })
  }

  try {
    // Use service client because anonymous users need to access tickets via code
    // The ticket_code itself acts as the authentication mechanism
    const client = getSupabaseClient()

    // Get ticket details
    const { data: ticket, error: ticketError } = await client
      .from('tickets')
      .select(`
        id,
        ticket_number,
        qr_code,
        pdf_url,
        scanned_at,
        created_at,
        ticket_order:ticket_orders!tickets_ticket_order_id_fkey (
          id,
          order_number,
          customer_name,
          customer_email,
          status
        ),
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
      .eq('qr_code', code)
      .maybeSingle()

    if (ticketError) {
      console.error('Ticket fetch error:', ticketError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch ticket'
      })
    }

    if (!ticket) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Ticket not found'
      })
    }

    // Check if payment is completed
    if (ticket.ticket_order?.status !== 'paid') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment for this ticket has not been completed'
      })
    }

    return {
      ticket
    }
  } catch (error: any) {
    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error
    }

    console.error('Get ticket API error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch ticket'
    })
  }
})