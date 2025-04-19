// server/api/tickets/email.ts
import { getSupabaseClient } from '../../utils/supabase';
import { emailService } from '../../utils/email';

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient();
    const body = await readBody(event);
    
    // Get required fields
    const orderId = body.orderId;
    const originalEmail = body.email; // For verification
    const sendToEmail = body.sendToEmail; // Target email
    
    if (!orderId || !originalEmail || !sendToEmail) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      });
    }
    
    // Validate that the original email matches the order
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .select('id, customer_name, email, total_amount_in_cents, payment_status, order_date, recital_show_id')
      .eq('id', orderId)
      .eq('email', originalEmail)
      .single();
    
    if (orderError || !order) {
      return createError({
        statusCode: 404,
        statusMessage: 'Order not found for this email'
      });
    }
    
    // Get the recital show details
    const { data: show, error: showError } = await client
      .from('recital_shows')
      .select('id, name, date, start_time, location')
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
      .select('id, ticket_code')
      .eq('order_id', orderId);
    
    if (ticketsError) {
      console.error('Tickets fetch error:', ticketsError);
      return createError({
        statusCode: 500,
        statusMessage: 'Error fetching tickets'
      });
    }
    
    // Send email
    const emailSent = await emailService.sendTicketConfirmation(
      sendToEmail,
      order.customer_name,
      order.id,
      tickets.length,
      show.name,
      show.date,
      show.start_time,
      show.location,
      order.total_amount_in_cents
    );
    
    if (!emailSent) {
      return createError({
        statusCode: 500,
        statusMessage: 'Failed to send email'
      });
    }
    
    return {
      success: true,
      message: 'Tickets sent successfully'
    };
  } catch (error) {
    console.error('Email tickets error:', error);
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to send tickets email'
    });
  }
});