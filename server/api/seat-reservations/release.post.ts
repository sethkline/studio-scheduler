// server/api/seat-reservations/release.post.ts
import { serverSupabaseClient } from '#supabase/server'
import { getReservationSessionId } from '~/server/utils/reservationSession'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  try {
    const body = await readBody(event)

    // Get session ID for ownership validation
    const sessionId = await getReservationSessionId(event)

    // Validate required fields
    if (!body.token && !body.reservation_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either token or reservation_id is required'
      })
    }

    let reservationId: string

    // If token provided, find the reservation and validate ownership
    if (body.token) {
      const { data: reservation, error: findError } = await client
        .from('seat_reservations')
        .select('id, session_id, is_active')
        .eq('reservation_token', body.token)
        .single()

      if (findError || !reservation) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Reservation not found'
        })
      }

      // Validate ownership
      if (reservation.session_id !== sessionId) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You do not have permission to release this reservation'
        })
      }

      if (!reservation.is_active) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Reservation is already inactive'
        })
      }

      reservationId = reservation.id
    } else {
      // If reservation_id provided, validate ownership
      const { data: reservation, error: findError } = await client
        .from('seat_reservations')
        .select('id, session_id, is_active')
        .eq('id', body.reservation_id)
        .single()

      if (findError || !reservation) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Reservation not found'
        })
      }

      // Validate ownership
      if (reservation.session_id !== sessionId) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You do not have permission to release this reservation'
        })
      }

      reservationId = body.reservation_id
    }

    // 1. Release the seats (set back to available)
    const { error: updateSeatsError } = await client
      .from('show_seats')
      .update({
        status: 'available',
        reserved_until: null,
        reserved_by: null
      })
      .eq('reserved_by', reservationId)
      .eq('status', 'reserved')

    if (updateSeatsError) {
      console.error('Error releasing seats:', updateSeatsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to release seats'
      })
    }

    // 2. Deactivate the reservation
    const { error: deactivateError } = await client
      .from('seat_reservations')
      .update({
        is_active: false
      })
      .eq('id', reservationId)

    if (deactivateError) {
      console.error('Error deactivating reservation:', deactivateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to deactivate reservation'
      })
    }

    return {
      success: true,
      message: 'Reservation released successfully',
      reservation_id: reservationId
    }

  } catch (error: any) {
    console.error('Release reservation API error:', error)

    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error
    }

    // Otherwise wrap in a generic error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to release reservation'
    })
  }
})
