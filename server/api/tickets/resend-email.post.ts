// server/api/tickets/resend-email.post.ts
import { getSupabaseClient } from '../../utils/supabase';
import { sendTicketConfirmationEmail } from '../../utils/ticketEmail';

/**
 * Admin endpoint to resend confirmation emails for ticket orders
 * Requires admin role
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient();
    const body = await readBody(event);

    // Get the authenticated user
    const authHeader = getHeader(event, 'authorization');
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - No auth token provided'
      });
    }

    // Extract user from JWT token (Supabase handles this)
    const token = authHeader.replace('Bearer ', '');

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await client.auth.getUser(token);

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Invalid token'
      });
    }

    // Check if user is admin or staff
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - User profile not found'
      });
    }

    if (!['admin', 'staff'].includes(profile.user_role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Admin or staff role required'
      });
    }

    // Validate required fields
    const { orderId, email } = body;

    if (!orderId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required field: orderId'
      });
    }

    // Verify order exists
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .select('id, customer_email, customer_name, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order not found'
      });
    }

    // Send email to specified address or original customer email
    const recipientEmail = email || order.customer_email;

    const emailSent = await sendTicketConfirmationEmail(orderId, {
      toEmail: recipientEmail,
      includePdfAttachments: true
    });

    if (!emailSent) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to send confirmation email'
      });
    }

    // Log the resend action (optional - could add to an audit log table)
    console.log(`Confirmation email resent for order ${orderId} by admin ${user.email}`);

    return {
      success: true,
      message: `Confirmation email sent to ${recipientEmail}`,
      orderId: order.id,
      recipientEmail
    };
  } catch (error: any) {
    console.error('Resend email error:', error);

    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error;
    }

    // Otherwise, return a generic error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to resend confirmation email'
    });
  }
});
