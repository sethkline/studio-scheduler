// server/api/orders/index.post.ts
import { getSupabaseClient } from '../../utils/supabase';
import { getStripeClient } from '../../utils/stripe';
import { sendTicketConfirmationEmail } from '../../utils/ticketEmail';

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient();
    const body = await readBody(event);
    
    // Validate required fields
    if (!body.reservation_token || !body.payment_intent_id || !body.customer_name || !body.email) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      });
    }
    
    console.log('Searching for reservation with token:', body.reservation_token);
    // Get reservation with seats
    const { data: reservation, error: reservationError } = await client
      .from('seat_reservations')
      .select(`
        id, 
        reservation_token,
        recital_show_id,
        expires_at,
        is_active,
        reservation_seats(seat_id)
      `)
      .eq('reservation_token', body.reservation_token)
      .single();

    if (reservationError) {
      console.error('Reservation query error:', reservationError);
      return createError({
        statusCode: 500,
        statusMessage: `Database error: ${reservationError.message}`
      });
    }
    
    if (!reservation) {
      console.log('No reservation found with token:', body.reservation_token);
      return createError({
        statusCode: 404,
        statusMessage: 'Reservation not found with the given token'
      });
    }
    
    // Check if reservation is expired
    if (new Date(reservation.expires_at) < new Date()) {
      return createError({
        statusCode: 400,
        statusMessage: 'Reservation has expired'
      });
    }
    
    // Check if reservation is still active
    if (!reservation.is_active) {
      return createError({
        statusCode: 400,
        statusMessage: 'Reservation is no longer active'
      });
    }
    
    // Verify payment with Stripe
    const stripe = getStripeClient();
    
    const paymentIntent = await stripe.paymentIntents.retrieve(body.payment_intent_id);
    
    if (paymentIntent.status !== 'succeeded') {
      return createError({
        statusCode: 400,
        statusMessage: 'Payment has not been completed'
      });
    }
    
    // Create the order
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .insert([{
        recital_show_id: reservation.recital_show_id,
        customer_name: body.customer_name,
        email: body.email,
        phone: body.phone || null,
        notes: body.special_requests || null, // Use notes instead of special_requests
        payment_method: 'stripe',
        payment_intent_id: body.payment_intent_id,
        payment_status: 'completed',
        total_amount_in_cents: paymentIntent.amount,
        opt_in_marketing: body.opt_in_marketing || false,
        order_date: new Date() // Explicitly set the order date
      }])
      .select()
      .single();
    
    if (orderError) {
      console.error('Order creation error:', orderError);
      return createError({
        statusCode: 500,
        statusMessage: 'Failed to create order'
      });
    }
    
    // Create tickets for each seat
    const seatIds = reservation.reservation_seats.map(rs => rs.seat_id);
    const ticketPromises = seatIds.map(seatId => {
      return client
        .from('tickets')
        .insert([{
          order_id: order.id,
          seat_id: seatId,
          ticket_code: generateTicketCode(),
          is_valid: true
        }]);
    });
    
    await Promise.all(ticketPromises);
    
    // Update seat status to 'sold'
    await client
      .from('show_seats')
      .update({ status: 'sold' })
      .in('id', seatIds);
    
    // Mark the reservation as inactive (completed)
    await client
      .from('seat_reservations')
      .update({ is_active: false })
      .eq('id', reservation.id);
    
    // Send confirmation email with PDF attachments
    // Fire and forget - don't fail the order if email fails
    sendTicketConfirmationEmail(order.id, {
      includePdfAttachments: true
    }).catch(err => {
      console.error('Failed to send confirmation email:', err);
    });
    
    return {
      message: 'Order created successfully',
      order: {
        id: order.id,
        customer_name: order.customer_name,
        email: order.email,
        total_amount_in_cents: order.total_amount_in_cents
      }
    };
  } catch (error) {
    console.error('Create order error:', error);
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create order'
    });
  }
});

function generateTicketCode() {
  // Generate a random 8-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}