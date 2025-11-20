// server/api/seat-reservations/reserve-v2.post.ts
/**
 * HARDENED Seat Reservation Endpoint (v2)
 *
 * Uses atomic database transaction for ACID guarantees
 * Prevents race conditions at database level
 * Includes comprehensive audit logging
 *
 * IMPROVEMENTS OVER v1:
 * - True PostgreSQL transaction (not manual rollback)
 * - Database-level double-booking prevention
 * - Automatic audit logging
 * - Simplified code (logic moved to database)
 * - Better error handling and reporting
 */

import { serverSupabaseClient } from '#supabase/server'
import { getReservationSessionId } from '~/server/utils/reservationSession'

interface ReserveSeatsRequest {
  show_id: string
  seat_ids: string[]
  email?: string
  phone?: string
}

interface ReserveSeatsResponse {
  success: boolean
  message?: string
  reservation?: {
    id: string
    token: string
    expires_at: string
    seat_count: number
    total_amount_in_cents: number
  }
  error?: {
    code: string
    message: string
  }
}

export default defineEventHandler(async (event): Promise<ReserveSeatsResponse> => {
  const client = await serverSupabaseClient(event)

  try {
    // Get session ID for this user/anonymous session
    const sessionId = await getReservationSessionId(event)

    // Get request body
    const body = await readBody<ReserveSeatsRequest>(event)

    // Get user agent and IP for audit logging
    const headers = getHeaders(event)
    const userAgent = headers['user-agent'] || null
    const ipAddress = headers['x-forwarded-for']?.split(',')[0] || headers['x-real-ip'] || null

    // Call atomic reservation function
    const { data, error } = await client.rpc('reserve_seats_atomic', {
      p_show_id: body.show_id,
      p_seat_ids: body.seat_ids,
      p_session_id: sessionId,
      p_email: body.email || null,
      p_phone: body.phone || null,
      p_user_agent: userAgent,
      p_ip_address: ipAddress
    })

    if (error) {
      console.error('Database error in reserve_seats_atomic:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to reserve seats'
      })
    }

    // The function returns a single row with result
    const result = data?.[0]

    if (!result) {
      throw createError({
        statusCode: 500,
        statusMessage: 'No result returned from reservation function'
      })
    }

    // Check if reservation was successful
    if (!result.success) {
      // Map error codes to HTTP status codes
      const statusCodeMap: Record<string, number> = {
        INVALID_INPUT: 400,
        TOO_MANY_SEATS: 400,
        DUPLICATE_RESERVATION: 409,
        SEATS_NOT_FOUND: 404,
        SEATS_UNAVAILABLE: 409,
        INTERNAL_ERROR: 500
      }

      const statusCode = statusCodeMap[result.error_code] || 500

      throw createError({
        statusCode,
        statusMessage: result.error_message || 'Failed to reserve seats'
      })
    }

    // Success! Return reservation details
    return {
      success: true,
      message: 'Seats reserved successfully',
      reservation: {
        id: result.reservation_id,
        token: result.reservation_token,
        expires_at: result.expires_at,
        seat_count: result.seat_count,
        total_amount_in_cents: result.total_amount_in_cents
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
