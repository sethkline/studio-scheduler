// server/api/tickets/search.ts
import { getSupabaseClient } from '../../utils/supabase';

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient();
    const body = await readBody(event);
    
    // Get search parameters
    const email = body.email;
    const phone = body.phone;
    
    if (!email && !phone) {
      return createError({
        statusCode: 400,
        statusMessage: 'Email or phone number is required'
      });
    }
    
    // Build query to find orders
    let query = client
      .from('ticket_orders')
      .select(`
        id,
        customer_name,
        email,
        recital_show_id,
        order_date,
        total_amount_in_cents,
        show:recital_show_id (
          name,
          date,
          start_time,
          location
        ),
        tickets:id (
          count
        )
      `);
    
    // Apply filters
    if (email) {
      query = query.eq('email', email);
    }
    
    if (phone) {
      // If both email and phone are provided, use OR condition
      if (email) {
        query = query.or(`email.eq.${email},phone.eq.${phone}`);
      } else {
        query = query.eq('phone', phone);
      }
    }
    
    // Order by most recent
    query = query.order('order_date', { ascending: false });
    
    // Execute query
    const { data: orders, error: ordersError } = await query;
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return createError({
        statusCode: 500,
        statusMessage: 'Error fetching orders'
      });
    }
    
    // Format the response
    const formattedOrders = orders.map(order => ({
      id: order.id,
      customer_name: order.customer_name,
      email: order.email,
      order_date: order.order_date,
      total_amount_in_cents: order.total_amount_in_cents,
      show_id: order.recital_show_id,
      show_name: order.show.name,
      show_date: order.show.date,
      show_time: order.show.start_time,
      show_location: order.show.location,
      tickets_count: order.tickets[0].count
    }));
    
    return {
      orders: formattedOrders
    };
  } catch (error) {
    console.error('Search tickets error:', error);
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to search for tickets'
    });
  }
});