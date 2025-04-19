// server/api/tickets/index.ts
import { getSupabaseClient } from '../../utils/supabase';

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient();
    const query = getQuery(event);
    
    // Get ticket by email and order ID
    const email = query.email as string;
    const orderId = query.orderId as string;
    
    if (!orderId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Order ID is required'
      });
    }
    
    // First validate that the order exists
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .select('id, customer_name, email, total_amount_in_cents, payment_status, order_date, recital_show_id')
      .eq('id', orderId)
      .single();
    
    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return createError({
        statusCode: 404,
        statusMessage: 'Order not found'
      });
    }
    
    // Verify email if provided (for security)
    if (email && order.email.toLowerCase() !== email.toLowerCase()) {
      return createError({
        statusCode: 403,
        statusMessage: 'Email does not match order'
      });
    }
    
    // Get the recital show details
    const { data: show, error: showError } = await client
      .from('recital_shows')
      .select('id, name, date, start_time, location, series_id')
      .eq('id', order.recital_show_id)
      .single();
    
    if (showError) {
      console.error('Show fetch error:', showError);
      return createError({
        statusCode: 500,
        statusMessage: 'Error fetching show details'
      });
    }
    
    // Get all tickets for this order
    const { data: tickets, error: ticketsError } = await client
      .from('tickets')
      .select(`
        id, 
        ticket_code, 
        is_valid,
        check_in_time,
        seat_id,
        seat:seat_id (
          id,
          section,
          row_name,
          seat_number,
          section_type,
          seat_type,
          handicap_access
        )
      `)
      .eq('order_id', orderId);
    
    if (ticketsError) {
      console.error('Tickets fetch error:', ticketsError);
      return createError({
        statusCode: 500,
        statusMessage: 'Error fetching tickets'
      });
    }
    
    console.log(`Found ${tickets ? tickets.length : 0} tickets for order ${orderId}`);
    
    // If no tickets found, this is suspicious - log it but return empty array
    if (!tickets || tickets.length === 0) {
      console.warn(`No tickets found for order ${orderId} - this is unusual`);
      
      // Check seat_id values in the tickets table for this order
      const { data: ticketSeats, error: ticketSeatsError } = await client
        .from('tickets')
        .select('id, seat_id')
        .eq('order_id', orderId);
        
      console.log('Ticket seat IDs check:', ticketSeats, ticketSeatsError);
      
      // Check if there are reserved seats for this show
      const { data: reservedSeats, error: reservedSeatsError } = await client
        .from('show_seats')
        .select('id, status, section, row_name, seat_number')
        .eq('status', 'sold')
        .eq('show_id', order.recital_show_id);
        
      console.log('Reserved seats check:', 
        reservedSeats ? `Found ${reservedSeats.length} seats` : 'No seats', 
        reservedSeatsError
      );
    }
    
    return {
      order: {
        id: order.id,
        customer_name: order.customer_name,
        email: order.email,
        total_amount_in_cents: order.total_amount_in_cents,
        payment_status: order.payment_status,
        order_date: order.order_date
      },
      show: {
        id: show.id,
        name: show.name,
        date: show.date,
        start_time: show.start_time,
        location: show.location
      },
      tickets: tickets.map(ticket => ({
        id: ticket.id,
        ticket_code: ticket.ticket_code,
        is_valid: ticket.is_valid,
        check_in_time: ticket.check_in_time,
        seat: {
          id: ticket.seat.id,
          section: ticket.seat.section,
          row_name: ticket.seat.row_name,
          seat_number: ticket.seat.seat_number,
          seat_type: ticket.seat.seat_type,
          handicap_access: ticket.seat.handicap_access
        }
      }))
    };
  } catch (error) {
    console.error('Fetch tickets error:', error);
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch tickets'
    });
  }
});