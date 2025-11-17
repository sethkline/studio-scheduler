// server/api/tickets/email.ts
import { getSupabaseClient } from '../../utils/supabase';
import { sendTicketConfirmationEmail } from '../../utils/ticketEmail';

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
      .select('id, customer_email')
      .eq('id', orderId)
      .eq('customer_email', originalEmail)
      .single();

    if (orderError || !order) {
      return createError({
        statusCode: 404,
        statusMessage: 'Order not found for this email'
      });
    }

    // Send email using enhanced email service
    const emailSent = await sendTicketConfirmationEmail(orderId, {
      toEmail: sendToEmail,
      includePdfAttachments: true
    });

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