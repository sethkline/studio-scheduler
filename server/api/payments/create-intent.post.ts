// server/api/payments/create-intent.ts
import { getSupabaseClient } from '../../utils/supabase';
import Stripe from 'stripe';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { reservation_token, amount, currency = 'usd', payment_method_types = ['card'] } = body;
    
    if (!reservation_token) {
      return createError({
        statusCode: 400,
        statusMessage: 'Reservation token is required'
      });
    }
    
    // Initialize Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY environment variable not set');
      return createError({
        statusCode: 500,
        statusMessage: 'Payment processing is not configured'
      });
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2022-11-15' // Specify the API version you want to use
    });
    
    // Get reservation details from database
    const client = getSupabaseClient();
    const { data: reservation, error: reservationError } = await client
      .from('seat_reservations')
      .select('*')
      .eq('reservation_token', reservation_token)
      .single();
    
    if (reservationError || !reservation) {
      console.error('Error fetching reservation:', reservationError);
      return createError({
        statusCode: 404,
        statusMessage: 'Reservation not found'
      });
    }
    
    // Check if reservation is expired
    if (new Date(reservation.expires_at) < new Date()) {
      return createError({
        statusCode: 410,
        statusMessage: 'Reservation has expired'
      });
    }
    
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Round to ensure integer
      currency,
      payment_method_types,
      metadata: {
        reservation_token,
        reservation_id: reservation.id
      },
      description: `Ticket purchase for reservation ${reservation_token}`
    });
    
    // Return the client secret to the client
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
    
  } catch (error) {
    console.error('Payment intent creation error:', error);
    
    // Return a more specific error message if available
    const errorMessage = error.message || 'Failed to create payment intent';
    
    return createError({
      statusCode: 500,
      statusMessage: errorMessage
    });
  }
});