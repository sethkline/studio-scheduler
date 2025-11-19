// server/utils/reservationSession.ts
/**
 * Utility for managing reservation sessions
 * Ensures that users can only access their own reservations
 */

import type { H3Event } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import { randomBytes } from 'crypto'

/**
 * Get or create a session ID for the current user
 * For authenticated users, use their user ID
 * For anonymous users, create/retrieve a session ID from cookie
 */
export async function getReservationSessionId(event: H3Event): Promise<string> {
  const client = await serverSupabaseClient(event)

  // Check if user is authenticated
  const { data: { user } } = await client.auth.getUser()

  if (user) {
    // Use user ID as session ID for authenticated users
    return user.id
  }

  // For anonymous users, use/create a session cookie
  const sessionCookieName = 'reservation_session'
  let sessionId = getCookie(event, sessionCookieName)

  if (!sessionId) {
    // Generate a new session ID
    sessionId = randomBytes(32).toString('hex')

    // Set cookie for 24 hours
    setCookie(event, sessionCookieName, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/'
    })
  }

  return sessionId
}

/**
 * Validate that the current session owns a reservation
 * Returns the session ID if valid, throws error if not
 */
export async function validateReservationOwnership(
  event: H3Event,
  reservationToken: string
): Promise<string> {
  const client = await serverSupabaseClient(event)
  const sessionId = await getReservationSessionId(event)

  // Fetch the reservation
  const { data: reservation, error } = await client
    .from('seat_reservations')
    .select('id, session_id')
    .eq('reservation_token', reservationToken)
    .single()

  if (error || !reservation) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Reservation not found'
    })
  }

  // Check if this session owns the reservation
  if (reservation.session_id !== sessionId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have permission to access this reservation'
    })
  }

  return sessionId
}

/**
 * Check if a session already has an active reservation for a show
 * Returns the existing reservation if found
 */
export async function getActiveReservationForShow(
  event: H3Event,
  showId: string
): Promise<any | null> {
  const client = await serverSupabaseClient(event)
  const sessionId = await getReservationSessionId(event)

  const { data: reservation, error } = await client
    .from('seat_reservations')
    .select('*')
    .eq('recital_show_id', showId)
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Error checking for active reservation:', error)
  }

  return reservation || null
}
