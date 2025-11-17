// server/api/orders/index.post.ts
import { getSupabaseClient } from '../../utils/supabase';
import { getStripeClient } from '../../utils/stripe';
import { sendTicketConfirmationEmail } from '../../utils/ticketEmail';
import { validateReservationOwnership } from '../../utils/reservationSession';

/**
 * SECURITY: Create ticket order after payment
 *
 * This endpoint creates an order ONLY after:
 * 1. Validating the reservation belongs to the current session (prevents hijacking)
 * 2. Verifying the Stripe payment succeeded
 * 3. Confirming the payment amount matches the expected total
 *
 * Uses service client ONLY after validation to bypass RLS for order creation.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // Validate required fields
    if (!body.reservation_token || !body.payment_intent_id || !body.customer_name || !body.email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      });
    }

    // SECURITY CHECK 1: Validate reservation ownership
    // This ensures the reservation belongs to the current session (authenticated user or anonymous cookie)
    // Throws 403 if session doesn't own this reservation
    const sessionId = await validateReservationOwnership(event, body.reservation_token);

    console.log('Creating order for reservation:', body.reservation_token, 'session:', sessionId);

    // Use session-aware client for initial queries
    const sessionClient = await serverSupabaseClient(event);

    // Get reservation with seats (already validated ownership above)
    const { data: reservation, error: reservationError } = await sessionClient
      .from('seat_reservations')
      .select(`
        id,
        reservation_token,
        recital_show_id,
        expires_at,
        is_active,
        session_id,
        reservation_seats(seat_id)
      `)
      .eq('reservation_token', body.reservation_token)
      .single();

    if (reservationError || !reservation) {
      console.error('Reservation query error:', reservationError);
      throw createError({
        statusCode: 404,
        statusMessage: 'Reservation not found'
      });
    }

    // Double-check session ownership (belt and suspenders)
    if (reservation.session_id !== sessionId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Reservation does not belong to your session'
      });
    }

    // Check if reservation is expired
    if (new Date(reservation.expires_at) < new Date()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Reservation has expired'
      });
    }

    // Check if reservation is still active
    if (!reservation.is_active) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Reservation is no longer active'
      });
    }

    // SECURITY CHECK 2: Verify payment with Stripe
    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(body.payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment has not been completed'
      });
    }

    // SECURITY CHECK 3: Verify payment amount matches reservation
    // Get show seats to calculate expected total
    const seatIds = reservation.reservation_seats.map(rs => rs.seat_id);

    const { data: showSeats, error: seatsError } = await sessionClient
      .from('show_seats')
      .select('price_in_cents')
      .in('id', seatIds);

    if (seatsError || !showSeats) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to retrieve seat prices'
      });
    }

    const expectedTotalCents = showSeats.reduce((sum, seat) => sum + (seat.price_in_cents || 0), 0);

    // Verify payment intent amount matches expected total
    if (paymentIntent.amount !== expectedTotalCents) {
      console.error(
        'Payment amount mismatch!',
        'Expected:', expectedTotalCents,
        'Received:', paymentIntent.amount,
        'Reservation:', body.reservation_token
      );
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment amount does not match reservation total'
      });
    }

    console.log('All security checks passed. Creating order...');

    // Now use service client to create order/tickets (bypassing RLS after validation)
    // This is SAFE because we've validated:
    // 1. Session owns the reservation
    // 2. Payment succeeded
    // 3. Payment amount matches expected total
    const serviceClient = getSupabaseClient();

    // Create the order
    const { data: order, error: orderError } = await serviceClient
      .from('ticket_orders')
      .insert([{
        show_id: reservation.recital_show_id,
        customer_name: body.customer_name,
        customer_email: body.email,
        customer_phone: body.phone || null,
        notes: body.special_requests || null,
        payment_method: 'stripe',
        stripe_payment_intent_id: body.payment_intent_id,
        status: 'confirmed',
        total_amount_cents: expectedTotalCents,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create order. Please contact support.'
      });
    }

    console.log('Order created:', order.id);

    // Create tickets for each seat
    const ticketInserts = seatIds.map(seatId => ({
      ticket_order_id: order.id,
      show_seat_id: seatId,
      qr_code: generateTicketCode(),
      status: 'valid'
    }));

    const { error: ticketsError } = await serviceClient
      .from('tickets')
      .insert(ticketInserts);

    if (ticketsError) {
      console.error('Ticket creation error:', ticketsError);
      // Rollback order?
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create tickets. Please contact support.'
      });
    }

    console.log('Tickets created for', seatIds.length, 'seats');

    // Update seat status to 'sold'
    const { error: updateSeatsError } = await serviceClient
      .from('show_seats')
      .update({ status: 'sold' })
      .in('id', seatIds);

    if (updateSeatsError) {
      console.error('Failed to update seat status:', updateSeatsError);
      // Continue anyway - order is created
    }

    // Mark the reservation as inactive (completed)
    await serviceClient
      .from('seat_reservations')
      .update({ is_active: false })
      .eq('id', reservation.id);

    console.log('Reservation marked as completed');

    // Send confirmation email with PDF attachments
    // Fire and forget - don't fail the order if email fails
    // SECURITY NOTE: Using service client here is safe because:
    // 1. We just created this order after extensive validation
    // 2. Email is sent to the customer who just paid
    // 3. Order ID is from our just-created record
    sendTicketConfirmationEmail(serviceClient, order.id, {
      includePdfAttachments: true
    }).catch(err => {
      console.error('Failed to send confirmation email:', err);
    });

    return {
      success: true,
      message: 'Order created successfully',
      order: {
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        total_amount_cents: order.total_amount_cents,
        ticket_count: seatIds.length
      }
    };
  } catch (error: any) {
    console.error('Create order error:', error);

    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error;
    }

    // Otherwise, wrap it
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create order',
      message: error.message
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