// server/api/ticket-orders/create.post.ts

import type { CreateTicketOrderRequest, CreateTicketOrderResponse } from '~/types/ticketing'
import { serverSupabaseClient } from '#supabase/server'
import { getReservationSessionId } from '~/server/utils/reservationSession'

export default defineEventHandler(async (event): Promise<CreateTicketOrderResponse> => {
  const client = await serverSupabaseClient(event)

  try {
    // Get session ID (works for both authenticated and anonymous users)
    const sessionId = await getReservationSessionId(event)

    // Get user ID if authenticated
    const { data: { user } } = await client.auth.getUser()
    const userId = user?.id || null

    // Read and validate request body
    const body = await readBody<CreateTicketOrderRequest>(event)

    const { show_id, reservation_token, customer_name, customer_email, customer_phone } = body

    // Validate required fields
    if (!show_id || !reservation_token || !customer_name || !customer_email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: show_id, reservation_token, customer_name, customer_email'
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customer_email)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid email address'
      })
    }

    // Step 1: Verify the reservation exists, is valid, and belongs to this session
    const { data: reservation, error: reservationError } = await client
      .from('seat_reservations')
      .select(`
        id,
        recital_show_id,
        reservation_token,
        session_id,
        expires_at,
        is_active,
        reservation_seats (
          id,
          show_seat_id
        )
      `)
      .eq('reservation_token', reservation_token)
      .eq('recital_show_id', show_id)
      .eq('is_active', true)
      .single()

    if (reservationError || !reservation) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Reservation not found or expired'
      })
    }

    // Verify this session owns the reservation
    if (reservation.session_id !== sessionId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to use this reservation'
      })
    }

    // Check if reservation has expired
    const now = new Date()
    const expiresAt = new Date(reservation.expires_at)
    if (expiresAt < now) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Reservation has expired. Please select your seats again.'
      })
    }

    // Check if reservation has seats
    if (!reservation.reservation_seats || reservation.reservation_seats.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No seats found in reservation'
      })
    }

    const seatIds = reservation.reservation_seats.map((rs: any) => rs.show_seat_id)

    // Step 2: Get seat details and calculate total
    const { data: seats, error: seatsError } = await client
      .from('show_seats')
      .select(`
        id,
        seat_id,
        price_in_cents,
        status,
        seats (
          id,
          row_name,
          seat_number,
          venue_sections (
            name
          )
        )
      `)
      .in('id', seatIds)

    if (seatsError || !seats || seats.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Could not retrieve seat information'
      })
    }

    // Verify all seats are still reserved
    const invalidSeats = seats.filter((seat: any) => seat.status !== 'reserved')
    if (invalidSeats.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Some seats are no longer available. Please select your seats again.'
      })
    }

    // Calculate total amount
    const totalAmountInCents = seats.reduce((sum: number, seat: any) => {
      return sum + (seat.price_in_cents || 0)
    }, 0)

    // Step 3: Generate order number using database function
    const { data: orderNumberData, error: orderNumberError } = await client
      .rpc('generate_order_number')

    if (orderNumberError || !orderNumberData) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to generate order number'
      })
    }

    const orderNumber = orderNumberData

    // Step 4: Create ticket order with session tracking
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .insert({
        show_id,
        customer_name,
        customer_email,
        customer_phone: customer_phone || null,
        total_amount_in_cents: totalAmountInCents,
        status: 'pending',
        order_number: orderNumber,
        session_id: sessionId,
        user_id: userId
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Error creating ticket order:', orderError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create ticket order'
      })
    }

    // Step 5: Create tickets for each seat
    const ticketsToCreate = seats.map((seat: any) => {
      return {
        ticket_order_id: order.id,
        show_seat_id: seat.id
      }
    })

    const { data: tickets, error: ticketsError } = await client
      .from('tickets')
      .insert(ticketsToCreate)
      .select()

    if (ticketsError) {
      console.error('Error creating tickets:', ticketsError)
      // Rollback: delete the order
      await client.from('ticket_orders').delete().eq('id', order.id)

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create tickets'
      })
    }

    // Step 6: Create order items for each ticket
    const orderItemsToCreate = seats.map((seat: any, index: number) => {
      const seatInfo = seat.seats
      const section = seatInfo?.venue_sections?.name || 'Unknown'
      const itemName = `${section} - Row ${seatInfo?.row_name} Seat ${seatInfo?.seat_number}`

      return {
        ticket_order_id: order.id,
        item_type: 'ticket',
        item_name: itemName,
        quantity: 1,
        price_in_cents: seat.price_in_cents,
        ticket_id: tickets[index].id
      }
    })

    const { error: orderItemsError } = await client
      .from('ticket_order_items')
      .insert(orderItemsToCreate)

    if (orderItemsError) {
      console.error('Error creating order items:', orderItemsError)
      // Continue anyway, items are not critical for order creation
    }

    return {
      success: true,
      order: {
        ...order,
        tickets
      },
      message: 'Order created successfully'
    }
  } catch (error: any) {
    console.error('Error in create order endpoint:', error)

    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error
    }

    // Otherwise, create a generic error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'An unexpected error occurred while creating the order'
    })
  }
})
