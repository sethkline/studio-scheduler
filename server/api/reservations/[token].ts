// server/api/reservations/[token].ts
import { getSupabaseClient } from '../../utils/supabase';

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient();
    const token = getRouterParam(event, 'token');
    
    if (!token) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing token parameter'
      });
    }
    
    // Get reservation with basic info
    const { data: reservation, error: reservationError } = await client
      .from('seat_reservations')
      .select(`
        id, 
        token:reservation_token,
        recital_show_id,
        email,
        phone,
        expires_at,
        is_active,
        created_at
      `)
      .eq('reservation_token', token)
      .single();
    
    if (reservationError || !reservation) {
      return createError({
        statusCode: 404,
        statusMessage: 'Reservation not found'
      });
    }
    
    // Check if reservation is expired
    const isExpired = new Date(reservation.expires_at) < new Date();
    if (isExpired) {
      return createError({
        statusCode: 410,
        statusMessage: 'Reservation has expired'
      });
    }
    
    // Check if reservation is still active
    if (!reservation.is_active) {
      return createError({
        statusCode: 410,
        statusMessage: 'Reservation is no longer active'
      });
    }
    
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
      .single();
    
    if (showError) {
      console.error('Show fetch error:', showError);
      return createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch show details'
      });
    }
    
    // Get seat IDs from reservation_seats
    const { data: reservationSeats, error: reservationSeatsError } = await client
      .from('reservation_seats')
      .select('seat_id')
      .eq('reservation_id', reservation.id);
    
    if (reservationSeatsError) {
      console.error('Reservation seats fetch error:', reservationSeatsError);
      return createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch reservation seats'
      });
    }
    
    const seatIds = reservationSeats.map(rs => rs.seat_id);
    
    // Get seat details
    const { data: seats, error: seatsError } = await client
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
      .order('seat_number');
    
    if (seatsError) {
      console.error('Seats fetch error:', seatsError);
      return createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch seat details'
      });
    }
    
    // Calculate total price
    const totalAmount = seats.reduce((sum, seat) => 
      sum + (seat.price_in_cents || show.ticket_price_in_cents || 0), 0
    );
    
    // Format response
    const formattedReservation = {
      id: reservation.id,
      token: reservation.token,
      show_id: show.id,
      show_name: show.name,
      show_date: show.date,
      show_time: show.start_time,
      show_location: show.location,
      ticket_price_in_cents: show.ticket_price_in_cents,
      email: reservation.email,
      phone: reservation.phone,
      expires_at: reservation.expires_at,
      is_active: reservation.is_active,
      created_at: reservation.created_at,
      seats: seats,
      seat_count: seats.length,
      total_amount_in_cents: totalAmount
    };
    
    return {
      reservation: formattedReservation
    };
  } catch (error) {
    console.error('Get reservation error:', error);
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch reservation'
    });
  }
});