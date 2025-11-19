import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    // Public endpoint - querying public data only

    const client = getSupabaseClient()
    const token = getRouterParam(event, 'token')
    
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
      .eq('reservation_token', token)
      .single()
    
    if (reservationError) throw reservationError
    
    // Check if reservation is active and not expired
    const now = new Date()
    const expiresAt = new Date(reservation.expires_at)
    
    if (!reservation.is_active || expiresAt < now) {
      return {
        active: false,
        message: 'Reservation has expired',
        expired: true
      }
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
    
    // Get seat details
    const { data: seats, error: seatDetailsError } = await client
      .from('show_seats')
      .select(`
        id,
        section,
        section_type,
        row_name,
        seat_number,
        seat_type,
        handicap_access,
        price_in_cents
      `)
      .in('id', seatIds)
      .order('section')
      .order('row_name')
      .order('seat_number')
    
    if (seatDetailsError) throw seatDetailsError
    
    // Get show details
    const { data: show, error: showError } = await client
      .from('recital_shows')
      .select(`
        id,
        name,
        date,
        start_time,
        location,
        ticket_price_in_cents
      `)
      .eq('id', reservation.recital_show_id)
      .single()
    
    if (showError) throw showError
    
    // Calculate time remaining in seconds
    const timeRemainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
    
    // Calculate total price
    const totalAmount = seats.reduce((sum, seat) => sum + (seat.price_in_cents || show.ticket_price_in_cents || 0), 0)
    
    return {
      active: true,
      reservation: {
        token: token,
        email: reservation.email,
        phone: reservation.phone,
        expires_at: reservation.expires_at,
        time_remaining_seconds: timeRemainingSeconds
      },
      show: {
        id: show.id,
        name: show.name,
        date: show.date,
        start_time: show.start_time,
        location: show.location
      },
      seats: seats,
      seat_count: seats.length,
      total_amount_in_cents: totalAmount
    }
  } catch (error) {
    console.error('Get reservation API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch reservation'
    })
  }
})