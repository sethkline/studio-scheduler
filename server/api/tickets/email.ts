// server/api/tickets/email.ts
import { sendTicketConfirmationEmail } from '../../utils/ticketEmail';

/**
 * POST /api/tickets/email
 * Resend ticket confirmation email (customer-facing)
 * Validates email ownership before sending
 * Uses RLS for data access
 */
export default defineEventHandler(async (event) => {
  try {
    // Use serverSupabaseClient which respects RLS
    const client = await serverSupabaseClient(event);
    const body = await readBody(event);

    // Get required fields
    const orderId = body.orderId;
    const originalEmail = body.email; // For verification
    const sendToEmail = body.sendToEmail; // Target email

    if (!orderId || !originalEmail || !sendToEmail) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      });
    }

    // Validate that the original email matches the order
    // RLS policies will ensure only accessible orders are returned
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .select('id, customer_email')
      .eq('id', orderId)
      .eq('customer_email', originalEmail)
      .single();

    if (orderError || !order) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order not found for this email'
      });
    }

    // Send email using enhanced email service
    // Pass the RLS-aware client to the email function
    const emailSent = await sendTicketConfirmationEmail(client, orderId, {
      toEmail: sendToEmail,
      includePdfAttachments: true
    });

    if (!emailSent) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to send email'
      });
    }

    return {
      success: true,
      message: 'Tickets sent successfully'
    };
  } catch (error: any) {
    console.error('Email tickets error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to send tickets email'
    });
  }
});