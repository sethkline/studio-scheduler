// server/api/seat-reservations/[token]/extend.post.ts
/**
 * Extend Reservation Endpoint
 *
 * Allows users to extend their seat reservation by 5 minutes
 * Maximum 3 extensions allowed (total 25 minutes: 10 initial + 15 extensions)
 *
 * POST /api/seat-reservations/{token}/extend
 */

import { serverSupabaseClient } from '#supabase/server'
import { getReservationSessionId } from '~/server/utils/reservationSession'

interface ExtendReservationResponse {
  success: boolean
  message?: string
  reservation?: {
    id: string
    expires_at: string
    extensions_remaining: number
  }
  error?: {
    code: string
    message: string
  }
}

export default defineEventHandler(async (event): Promise<ExtendReservationResponse> => {
  const client = await serverSupabaseClient(event)

  try {
    // Get reservation token from URL
    const token = getRouterParam(event, 'token')

    if (!token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Reservation token is required'
      })
    }

    // Get session ID for ownership validation
    const sessionId = await getReservationSessionId(event)

    // Call atomic extension function
    const { data, error } = await client.rpc('extend_reservation_atomic', {
      p_reservation_token: token,
      p_session_id: sessionId
    })

    if (error) {
      console.error('Database error in extend_reservation_atomic:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to extend reservation'
      })
    }

    // The function returns a single row with result
    const result = data?.[0]

    if (!result) {
      throw createError({
        statusCode: 500,
        statusMessage: 'No result returned from extension function'
      })
    }

    // Check if extension was successful
    if (!result.success) {
      // Map error codes to HTTP status codes
      const statusCodeMap: Record<string, number> = {
        NOT_FOUND: 404,
        PERMISSION_DENIED: 403,
        RESERVATION_INACTIVE: 400,
        RESERVATION_EXPIRED: 400,
        MAX_EXTENSIONS_REACHED: 429, // Too Many Requests
        INTERNAL_ERROR: 500
      }

      const statusCode = statusCodeMap[result.error_code] || 500

      throw createError({
        statusCode,
        statusMessage: result.error_message || 'Failed to extend reservation'
      })
    }

    // Success! Return updated reservation details
    return {
      success: true,
      message: result.extensions_remaining > 0
        ? `Reservation extended by 5 minutes. ${result.extensions_remaining} extension(s) remaining.`
        : 'Reservation extended by 5 minutes. This was your last extension.',
      reservation: {
        id: result.reservation_id,
        expires_at: result.new_expires_at,
        extensions_remaining: result.extensions_remaining
      }
    }

  } catch (error: any) {
    console.error('Extend reservation API error:', error)

    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error
    }

    // Otherwise wrap in a generic error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to extend reservation'
    })
  }
})
