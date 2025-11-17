// server/api/seat-reservations/reserve.post.ts
import { serverSupabaseClient } from '#supabase/server'
import { randomBytes } from 'crypto'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  try {
    const body = await readBody(event)

    // Validate required fields
    if (!body.show_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'show_id is required'
      })
    }

    if (!body.seat_ids || !Array.isArray(body.seat_ids) || body.seat_ids.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'seat_ids array is required and must not be empty'
      })
    }

    // Validate max seats
    if (body.seat_ids.length > 10) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot reserve more than 10 seats at once'
      })
    }

    // Generate a secure reservation token
    const reservationToken = randomBytes(32).toString('hex')

    // Set expiration time (10 minutes from now as per story requirements)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // First check if all seats are available and belong to this show
    const { data: seatData, error: seatCheckError } = await client
      .from('show_seats')
      .select(`
        id,
        status,
        reserved_until,
        show_id,
        seat_id,
        price_in_cents,
        seats:seat_id (
          section,
          row_name,
          seat_number,
          handicap_access,
          seat_type
        )
      `)
      .in('id', body.seat_ids)

    if (seatCheckError) {
      console.error('Error checking seats:', seatCheckError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to check seat availability'
      })
    }

    // Check if all the requested seats exist
    if (!seatData || seatData.length !== body.seat_ids.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'One or more selected seats do not exist'
      })
    }

    // Check if all seats belong to this show
    const wrongShowSeats = seatData.filter(seat => seat.show_id !== body.show_id)
    if (wrongShowSeats.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'One or more selected seats do not belong to this show'
      })
    }

    // Verify all seats are available
    const now = new Date()
    const unavailableSeats = seatData.filter(seat => {
      // Seat is unavailable if:
      // 1. Status is not 'available'
      // 2. OR it has a future reservation
      return (
        seat.status !== 'available' ||
        (seat.reserved_until && new Date(seat.reserved_until) > now)
      )
    })

    if (unavailableSeats.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'One or more selected seats are no longer available'
      })
    }

    // Everything is valid, start the transaction

    // 1. Create the reservation
    const { data: reservation, error: reservationError } = await client
      .from('seat_reservations')
      .insert({
        recital_show_id: body.show_id,
        email: body.email || null,
        phone: body.phone || null,
        reservation_token: reservationToken,
        expires_at: expiresAt,
        is_active: true
      })
      .select()
      .single()

    if (reservationError) {
      console.error('Error creating reservation:', reservationError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create reservation'
      })
    }

    const reservationId = reservation.id

    // 2. Create the reservation-seat relationships
    const reservationSeats = body.seat_ids.map(seatId => ({
      reservation_id: reservationId,
      seat_id: seatId
    }))

    const { error: reservationSeatsError } = await client
      .from('reservation_seats')
      .insert(reservationSeats)

    if (reservationSeatsError) {
      console.error('Error creating reservation seats:', reservationSeatsError)

      // Rollback: Delete the reservation we just created
      await client
        .from('seat_reservations')
        .delete()
        .eq('id', reservationId)

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to link seats to reservation'
      })
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

    if (updateSeatsError) {
      console.error('Error updating seat status:', updateSeatsError)

      // Rollback: Delete everything
      await client
        .from('reservation_seats')
        .delete()
        .eq('reservation_id', reservationId)

      await client
        .from('seat_reservations')
        .delete()
        .eq('id', reservationId)

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to reserve seats'
      })
    }

    // 4. Build response with seat details
    const reservedSeats = seatData.map(showSeat => ({
      id: showSeat.id,
      section: showSeat.seats?.section || '',
      row_name: showSeat.seats?.row_name || '',
      seat_number: showSeat.seats?.seat_number || '',
      seat_type: showSeat.seats?.seat_type || '',
      handicap_access: showSeat.seats?.handicap_access || false,
      price_in_cents: showSeat.price_in_cents || 0
    }))

    // Calculate total price
    const totalAmount = reservedSeats.reduce((sum, seat) =>
      sum + seat.price_in_cents, 0
    )

    // Success! Return the reservation details
    return {
      success: true,
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

  } catch (error: any) {
    console.error('Reserve seats API error:', error)

    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error
    }

    // Otherwise wrap in a generic error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to reserve seats'
    })
  }
})
