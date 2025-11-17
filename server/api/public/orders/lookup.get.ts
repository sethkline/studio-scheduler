// server/api/public/orders/lookup.get.ts
/**
 * PUBLIC API - Order Lookup
 *
 * SECURITY: Requires both order_number AND customer_email to prevent enumeration
 * Uses RLS-aware client for proper access control
 */

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  // SECURITY: Require BOTH order_number and email to prevent enumeration attacks
  if (!query.order_number || !query.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Both order_number and email are required'
    })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(query.email as string)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid email format'
    })
  }

  try {
    // Use RLS-aware client (respects row-level security policies)
    const client = await serverSupabaseClient(event)

    // Query with BOTH order_number and email - prevents unauthorized access
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        total_amount_in_cents,
        status,
        created_at,
        show:recital_shows!ticket_orders_show_id_fkey (
          id,
          title,
          show_date,
          show_time
        )
      `)
      .eq('order_number', query.order_number)
      .eq('customer_email', query.email)
      .maybeSingle()

    if (orderError) {
      console.error('Order lookup error:', orderError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to lookup order'
      })
    }

    // No order found with matching credentials
    if (!order) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order not found. Please check your order number and email.'
      })
    }

    return {
      order
    }
  } catch (error: any) {
    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error
    }

    console.error('Lookup orders API error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to lookup order'
    })
  }
})