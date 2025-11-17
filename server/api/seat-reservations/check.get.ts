// server/api/seat-reservations/check.get.ts
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  try {
    const query = getQuery(event)

    // Validate required fields
    if (!query.token && !query.reservation_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either token or reservation_id query parameter is required'
      })
    }

    let queryBuilder = client
      .from('seat_reservations')
      .select(`
        id,
        recital_show_id,
        email,
        phone,
        reservation_token,
        expires_at,
        is_active,
        created_at,
        reservation_seats (
          seat_id,
          show_seats:seat_id (
            id,
            price_in_cents,
            status,
            seats:seat_id (
              section,
              row_name,
              seat_number,
              seat_type,
              handicap_access
            )
          )
        )
      `)

    if (query.token) {
      queryBuilder = queryBuilder.eq('reservation_token', query.token as string)
    } else {
      queryBuilder = queryBuilder.eq('id', query.reservation_id as string)
    }

    const { data: reservation, error: findError } = await queryBuilder.single()

    if (findError || !reservation) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Reservation not found'
      })
    }

    // Check if reservation is expired
    const now = new Date()
    const expiresAt = new Date(reservation.expires_at)
    const isExpired = expiresAt < now

    // Build seat details for response
    const seats = reservation.reservation_seats?.map(rs => {
      const showSeat = rs.show_seats
      const seat = showSeat?.seats

      return {
        id: showSeat?.id || '',
        section: seat?.section || '',
        row_name: seat?.row_name || '',
        seat_number: seat?.seat_number || '',
        seat_type: seat?.seat_type || '',
        handicap_access: seat?.handicap_access || false,
        price_in_cents: showSeat?.price_in_cents || 0,
        status: showSeat?.status || 'unknown'
      }
    }) || []

    // Calculate total price
    const totalAmount = seats.reduce((sum, seat) =>
      sum + seat.price_in_cents, 0
    )

    // Calculate time remaining (in seconds)
    const timeRemaining = isExpired ? 0 : Math.floor((expiresAt.getTime() - now.getTime()) / 1000)

    return {
      success: true,
      reservation: {
        id: reservation.id,
        token: reservation.reservation_token,
        show_id: reservation.recital_show_id,
        email: reservation.email,
        phone: reservation.phone,
        expires_at: reservation.expires_at,
        is_active: reservation.is_active,
        is_expired: isExpired,
        time_remaining_seconds: timeRemaining,
        created_at: reservation.created_at,
        seats,
        seat_count: seats.length,
        total_amount_in_cents: totalAmount
      }
    }

  } catch (error: any) {
    console.error('Check reservation API error:', error)

    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error
    }

    // Otherwise wrap in a generic error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to check reservation'
    })
  }
})
