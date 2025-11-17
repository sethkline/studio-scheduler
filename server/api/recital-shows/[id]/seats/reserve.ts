import { randomBytes } from 'crypto'

/**
 * POST /api/recital-shows/:id/seats/reserve
 * Reserve seats for a show (public endpoint)
 * Uses RLS for data access
 */
export default defineEventHandler(async (event) => {
  // Use serverSupabaseClient which respects RLS policies
  // This is a public endpoint, but RLS controls what can be accessed
  const client = await serverSupabaseClient(event)
  const id = getRouterParam(event, 'id')

  
  try {
    const body = await readBody(event)
    console.log('Received reservation request:', body);
    
    // Validate required fields
    if (!body.seat_ids || !Array.isArray(body.seat_ids) || body.seat_ids.length === 0) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    // Generate a secure token
    const reservationToken = randomBytes(16).toString('hex')
    
    // Set expiration time (30 minutes from now)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    
    // First check if all seats are available and belong to this show
    const { data: seatData, error: seatCheckError } = await client
      .from('show_seats')
      .select('id, status, reserved_until, show_id')
      .in('id', body.seat_ids)

      console.log('Seat data:', seatData);
    
    if (seatCheckError) throw seatCheckError
    
    // Check if all the requested seats exist
    if (seatData.length !== body.seat_ids.length) {
      return createError({
        statusCode: 404,
        statusMessage: 'One or more selected seats do not exist'
      })
    }
    
    // Check if all seats belong to this show
    const wrongShowSeats = seatData.filter(seat => seat.show_id !== id)
    if (wrongShowSeats.length > 0) {
      return createError({
        statusCode: 400,
        statusMessage: 'One or more selected seats do not belong to this show'
      })
    }
    
    // Verify all seats are available
    const unavailableSeats = seatData.filter(seat => 
      seat.status !== 'available' || 
      (seat.reserved_until && new Date(seat.reserved_until) > new Date())
    )

console.log('Unavailable seats:', unavailableSeats);

    
    if (unavailableSeats.length > 0) {
      return createError({
        statusCode: 409,
        statusMessage: 'One or more selected seats are no longer available'
      })
    }
    
    // Everything is valid, start the transaction sequence
    
    // 1. Create the reservation
    const { data: reservation, error: reservationError } = await client
      .from('seat_reservations')
      .insert({
        recital_show_id: id,
        email: body.email || 'pending@example.com',
        phone: body.phone || null,
        reservation_token: reservationToken,
        expires_at: expiresAt,
        is_active: true // Using is_active instead of status
      })
      .select()
    
    if (reservationError) throw reservationError
    
    const reservationId = reservation[0].id
    
    // 2. Create the reservation-seat relationships
    const reservationSeats = body.seat_ids.map(seatId => ({
      reservation_id: reservationId,
      seat_id: seatId
    }))
    
    const { error: reservationSeatsError } = await client
      .from('reservation_seats')
      .insert(reservationSeats)
    
    if (reservationSeatsError) {
      // If this fails, delete the reservation we just created
      await client
        .from('seat_reservations')
        .delete()
        .eq('id', reservationId)
      
      throw reservationSeatsError
    }
    
    // 3. Update the seats to reserved status
    const { error: updateSeatsError } = await client
      .from('show_seats')
      .update({
        status: 'reserved',
        reserved_until: expiresAt,
        reserved_by: reservationId
      })
      .in('id', body.seat_ids)
      .eq('show_id', id) // This ensures we only update seats for this show
    
    if (updateSeatsError) {
      // If this fails, clean up everything
      await client
        .from('reservation_seats')
        .delete()
        .eq('reservation_id', reservationId)
      
      await client
        .from('seat_reservations')
        .delete()
        .eq('id', reservationId)
      
      throw updateSeatsError
    }
    
    // 4. Get the complete seat details for response
    const { data: reservedSeats, error: reservedSeatsError } = await client
      .from('show_seats')
      .select('id, section, row_name, seat_number, seat_type, price_in_cents, handicap_access')
      .in('id', body.seat_ids)
      .order('section')
      .order('row_name')
      .order('seat_number')
    
    if (reservedSeatsError) throw reservedSeatsError
    
    // Calculate total price
    const totalAmount = reservedSeats.reduce((sum, seat) => 
      sum + (seat.price_in_cents || 0), 0
    )
    
    // Success! Return the reservation details
    return {
      message: 'Seats reserved successfully',
      reservation: {
        id: reservationId,
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
      statusMessage: 'Failed to reserve seats: ' + (error.message || 'Unknown error')
    })
  }
})