import { getSupabaseClient } from '../../../../../utils/supabase'

import { randomBytes } from 'crypto'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.seat_ids || !body.email || !Array.isArray(body.seat_ids) || body.seat_ids.length === 0) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    // Generate a secure token
    const reservationToken = randomBytes(16).toString('hex')
    
    // Set expiration time (30 minutes from now)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    
    // Create reservation entry
    const { data: reservation, error: reservationError } = await client
      .from('seat_reservations')
      .insert({
        recital_show_id: id,
        email: body.email,
        phone: body.phone || null,
        reservation_token: reservationToken,
        expires_at: expiresAt
      })
      .select()
    
    if (reservationError) throw reservationError
    
    const reservationId = reservation[0].id
    
    // Check if all seats are available
    const { data: seatData, error: seatCheckError } = await client
      .from('show_seats')
      .select('id, status, reserved_until')
      .in('id', body.seat_ids)
      .eq('recital_show_id', id)
    
    if (seatCheckError) throw seatCheckError
    
    // Verify all seats are available
    const unavailableSeats = seatData.filter(seat => 
      seat.status !== 'available' || 
      (seat.reserved_until && new Date(seat.reserved_until) > new Date())
    )
    
    if (unavailableSeats.length > 0) {
      // Clean up the reservation we just created
      await client
        .from('seat_reservations')
        .delete()
        .eq('id', reservationId)
      
      return createError({
        statusCode: 409,
        statusMessage: 'One or more selected seats are no longer available'
      })
    }
    
    // Start a transaction to update seats and create reservation links
    const reservationSeats = body.seat_ids.map(seatId => ({
      reservation_id: reservationId,
      seat_id: seatId
    }))
    
    // Insert reservation-seat relationships
    const { error: reservationSeatsError } = await client
      .from('reservation_seats')
      .insert(reservationSeats)
    
    if (reservationSeatsError) throw reservationSeatsError
    
    // Update seats to reserved status
    const { error: updateSeatsError } = await client
      .from('show_seats')
      .update({
        status: 'reserved',
        reserved_until: expiresAt,
        reserved_by: reservationId
      })
      .in('id', body.seat_ids)
    
    if (updateSeatsError) throw updateSeatsError
    
    // Get seat details for response
    const { data: reservedSeats, error: reservedSeatsError } = await client
      .from('show_seats')
      .select('id, section, row_name, seat_number, seat_type, price_in_cents')
      .in('id', body.seat_ids)
      .order('section')
      .order('row_name')
      .order('seat_number')
    
    if (reservedSeatsError) throw reservedSeatsError
    
    // Calculate total price
    const totalAmount = reservedSeats.reduce((sum, seat) => sum + (seat.price_in_cents || 0), 0)
    
    return {
      message: 'Seats reserved successfully',
      reservation: {
        token: reservationToken,
        expires_at: expiresAt,
        seats: reservedSeats,
        seat_count: reservedSeats.length,
        total_amount_in_cents: totalAmount
      }
    }
  } catch (error) {
    console.error('Reserve seats API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to reserve seats'
    })
  }
})