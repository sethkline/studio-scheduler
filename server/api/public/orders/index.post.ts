
// server/api/public/orders/index.post.ts
import { getSupabaseClient } from '../../../utils/supabase'
import { randomBytes } from 'crypto'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.reservation_token || !body.customer_name || !body.payment_method) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    // Find the reservation
    const { data: reservation, error: reservationError } = await client
      .from('seat_reservations')
      .select(`
        id,
        recital_show_id,
        email,
        phone,
        expires_at,
        is_active
      `)
      .eq('reservation_token', body.reservation_token)
      .single()
    
    if (reservationError) throw reservationError
    
    // Check if reservation is active and not expired
    const now = new Date()
    const expiresAt = new Date(reservation.expires_at)
    
    if (!reservation.is_active || expiresAt < now) {
      return createError({
        statusCode: 410,
        statusMessage: 'Reservation has expired'
      })
    }
    
    // Get the seats associated with this reservation
    const { data: reservationSeats, error: seatsError } = await client
      .from('reservation_seats')
      .select(`
        seat_id
      `)
      .eq('reservation_id', reservation.id)
    
    if (seatsError) throw seatsError
    
    const seatIds = reservationSeats.map(row => row.seat_id)
    
    if (seatIds.length === 0) {
      return createError({
        statusCode: 400,
        statusMessage: 'No seats in this reservation'
      })
    }
    
    // Get show details for default price
    const { data: show, error: showError } = await client
      .from('recital_shows')
      .select(`
        id,
        name,
        ticket_price_in_cents
      `)
      .eq('id', reservation.recital_show_id)
      .single()
    
    if (showError) throw showError
    
    // Get seat details including price
    const { data: seats, error: seatDetailsError } = await client
      .from('show_seats')
      .select(`
        id,
        price_in_cents
      `)
      .in('id', seatIds)
    
    if (seatDetailsError) throw seatDetailsError
    
    // Calculate total price
    const totalAmount = seats.reduce((sum, seat) => 
      sum + (seat.price_in_cents || show.ticket_price_in_cents || 0), 0
    )
    
    // Create the order
    const { data: orderData, error: orderError } = await client
      .from('ticket_orders')
      .insert({
        recital_show_id: reservation.recital_show_id,
        customer_name: body.customer_name,
        email: reservation.email,
        phone: reservation.phone,
        total_amount_in_cents: totalAmount,
        payment_method: body.payment_method,
        payment_intent_id: body.payment_intent_id,
        payment_status: body.payment_status || 'pending',
        notes: body.notes
      })
      .select()
    
    if (orderError) throw orderError
    
    const orderId = orderData[0].id
    
    // Create tickets for each seat
    const tickets = []
    
    for (const seat of seats) {
      // Generate unique ticket code
      const ticketCode = randomBytes(8).toString('hex')
      
      const { data: ticketData, error: ticketError } = await client
        .from('tickets')
        .insert({
          order_id: orderId,
          seat_id: seat.id,
          ticket_code: ticketCode,
          price_in_cents: seat.price_in_cents || show.ticket_price_in_cents || 0
        })
        .select()
      
      if (ticketError) throw ticketError
      
      tickets.push(ticketData[0])
      
      // Update seat status to sold
      const { error: updateSeatError } = await client
        .from('show_seats')
        .update({
          status: 'sold',
          reserved_until: null,
          reserved_by: null
        })
        .eq('id', seat.id)
      
      if (updateSeatError) throw updateSeatError
    }
    
    // Mark reservation as inactive
    const { error: updateReservationError } = await client
      .from('seat_reservations')
      .update({
        is_active: false
      })
      .eq('id', reservation.id)
    
    if (updateReservationError) throw updateReservationError
    
    // Get detailed ticket information
    const { data: detailedTickets, error: detailedTicketsError } = await client
      .from('tickets')
      .select(`
        id,
        ticket_code,
        price_in_cents,
        seat:seat_id (
          id,
          section,
          row_name,
          seat_number
        )
      `)
      .eq('order_id', orderId)
    
    if (detailedTicketsError) throw detailedTicketsError
    
    return {
      message: 'Order created successfully',
      order: {
        id: orderId,
        customer_name: body.customer_name,
        email: reservation.email,
        total_amount_in_cents: totalAmount,
        payment_status: body.payment_status || 'pending'
      },
      show: {
        id: show.id,
        name: show.name
      },
      tickets: detailedTickets
    }
  } catch (error) {
    console.error('Create order API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create order'
    })
  }
})