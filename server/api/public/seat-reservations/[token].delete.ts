// server/api/public/seat-reservations/[token].delete.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const token = getRouterParam(event, 'token')
    
    // Find the reservation
    const { data: reservation, error: reservationError } = await client
      .from('seat_reservations')
      .select('id, is_active')
      .eq('reservation_token', token)
      .single()
    
    if (reservationError) throw reservationError
    
    if (!reservation.is_active) {
      return {
        message: 'Reservation is already inactive',
        canceled: false
      }
    }
    
    // Get seats associated with this reservation
    const { data: reservationSeats, error: seatsError } = await client
      .from('reservation_seats')
      .select('seat_id')
      .eq('reservation_id', reservation.id)
    
    if (seatsError) throw seatsError
    
    const seatIds = reservationSeats.map(row => row.seat_id)
    
    // Update seats back to available status
    if (seatIds.length > 0) {
      const { error: updateSeatsError } = await client
        .from('show_seats')
        .update({
          status: 'available',
          reserved_until: null,
          reserved_by: null
        })
        .in('id', seatIds)
      
      if (updateSeatsError) throw updateSeatsError
    }
    
    // Mark reservation as inactive
    const { error: updateReservationError } = await client
      .from('seat_reservations')
      .update({
        is_active: false
      })
      .eq('id', reservation.id)
    
    if (updateReservationError) throw updateReservationError
    
    return {
      message: 'Reservation canceled successfully',
      canceled: true
    }
  } catch (error) {
    console.error('Cancel reservation API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to cancel reservation'
    })
  }
})