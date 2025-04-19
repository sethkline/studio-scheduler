// server/api/tickets/verify.ts
import { getSupabaseClient } from '../../utils/supabase';

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient();
    const body = await readBody(event);
    
    // Get ticket by code
    const ticketCode = body.ticket_code;
    
    if (!ticketCode) {
      return createError({
        statusCode: 400,
        statusMessage: 'Ticket code is required'
      });
    }
    
    // Get the ticket
    const { data: ticket, error: ticketError } = await client
      .from('tickets')
      .select(`
        id, 
        ticket_code, 
        is_valid,
        order_id,
        seat_id,
        order:order_id (
          id,
          customer_name,
          email,
          recital_show_id,
          show:recital_show_id (
            id,
            name,
            date,
            start_time,
            location
          )
        ),
        seat:seat_id (
          id,
          section,
          row_name,
          seat_number
        )
      `)
      .eq('ticket_code', ticketCode)
      .single();
    
    if (ticketError || !ticket) {
      return {
        valid: false,
        message: 'Ticket not found'
      };
    }
    
    // Check if ticket is valid
    if (!ticket.is_valid) {
      return {
        valid: false,
        message: 'Ticket has been invalidated or already used'
      };
    }
    
    return {
      valid: true,
      ticket: {
        id: ticket.id,
        ticket_code: ticket.ticket_code,
        customer_name: ticket.order.customer_name,
        email: ticket.order.email,
        seat: {
          section: ticket.seat.section,
          row_name: ticket.seat.row_name,
          seat_number: ticket.seat.seat_number
        },
        show: {
          name: ticket.order.show.name,
          date: ticket.order.show.date,
          start_time: ticket.order.show.start_time,
          location: ticket.order.show.location
        }
      }
    };
  } catch (error) {
    console.error('Verify ticket error:', error);
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to verify ticket'
    });
  }
});