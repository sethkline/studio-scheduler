// server/api/seat-reservations/release-v2.post.ts
/**
 * HARDENED Release Reservation Endpoint (v2)
 *
 * Uses atomic database transaction for ACID guarantees
 * Includes audit logging
 */

import { serverSupabaseClient } from '#supabase/server'
import { getReservationSessionId } from '~/server/utils/reservationSession'

interface ReleaseReservationRequest {
  token?: string
  reservation_id?: string
}

interface ReleaseReservationResponse {
  success: boolean
  message?: string
  reservation_id?: string
  seats_released?: number
  error?: {
    code: string
    message: string
  }
}

export default defineEventHandler(async (event): Promise<ReleaseReservationResponse> => {
  const client = await serverSupabaseClient(event)

  try {
    const body = await readBody<ReleaseReservationRequest>(event)

    // Get session ID for ownership validation
    const sessionId = await getReservationSessionId(event)

    // Validate that at least one identifier is provided
    if (!body.token && !body.reservation_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either token or reservation_id is required'
      })
    }

    // If reservation_id provided, need to look up the token first
    let reservationToken = body.token

    if (!reservationToken && body.reservation_id) {
      const { data: reservation } = await client
        .from('seat_reservations')
        .select('reservation_token')
        .eq('id', body.reservation_id)
        .single()

      if (!reservation) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Reservation not found'
        })
      }

      reservationToken = reservation.reservation_token
    }

    // Call atomic release function
    const { data, error } = await client.rpc('release_seats_atomic', {
      p_reservation_token: reservationToken,
      p_session_id: sessionId
    })

    if (error) {
      console.error('Database error in release_seats_atomic:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to release reservation'
      })
    }

    // The function returns a single row with result
    const result = data?.[0]

    if (!result) {
      throw createError({
        statusCode: 500,
        statusMessage: 'No result returned from release function'
      })
    }

    // Check if release was successful
    if (!result.success) {
      // Map error codes to HTTP status codes
      const statusCodeMap: Record<string, number> = {
        NOT_FOUND: 404,
        PERMISSION_DENIED: 403,
        ALREADY_INACTIVE: 400,
        INTERNAL_ERROR: 500
      }

      const statusCode = statusCodeMap[result.error_code] || 500

      throw createError({
        statusCode,
        statusMessage: result.error_message || 'Failed to release reservation'
      })
    }

    // Success!
    return {
      success: true,
      message: 'Reservation released successfully',
      reservation_id: result.reservation_id,
      seats_released: result.seats_released
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
