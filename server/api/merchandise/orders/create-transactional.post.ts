import { getSupabaseClient } from '../../../utils/supabase'

/**
 * SECURE ORDER CREATION ENDPOINT
 *
 * This endpoint uses a PostgreSQL transaction function to ensure:
 * 1. All prices are calculated from database, never trusted from client
 * 2. Inventory is validated and reserved atomically
 * 3. No race conditions or partial failures
 * 4. Complete rollback on any error
 *
 * To use this endpoint, first run the migration:
 * supabase/migrations/merchandise_order_transaction.sql
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)
    const user = event.context.user || null

    // Validate required fields
    if (!body.checkout || !body.items || body.items.length === 0) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: checkout data and items'
      })
    }

    const { checkout, items } = body

    // Validate that items only contain variant_id and quantity
    // DO NOT trust any pricing information from the client
    const validatedItems = items.map((item: any) => {
      const quantity = parseInt(item.quantity, 10)

      if (!item.variant_id || quantity <= 0 || !Number.isInteger(quantity)) {
        throw new Error('Invalid item data: variant_id and positive integer quantity required')
      }

      return {
        variant_id: item.variant_id,
        quantity
      }
    })

    // Call the database transaction function
    // This function will:
    // - Fetch actual prices from database
    // - Validate inventory with row-level locks
    // - Create order and order items
    // - Reserve inventory
    // All in a single atomic transaction
    const { data, error } = await client.rpc('create_merchandise_order', {
      p_user_id: user?.id || null,
      p_customer_name: checkout.customer_name,
      p_email: checkout.email,
      p_phone: checkout.phone || null,
      p_fulfillment_method: checkout.fulfillment_method,
      p_shipping_address: checkout.shipping_address || null,
      p_notes: checkout.notes || null,
      p_items: validatedItems
    })

    if (error) throw error

    // Check if the function returned an error
    if (!data || data.length === 0) {
      return createError({
        statusCode: 500,
        statusMessage: 'Failed to create order'
      })
    }

    const result = data[0]

    if (result.error_message) {
      return createError({
        statusCode: 400,
        statusMessage: result.error_message
      })
    }

    // Fetch the complete order with items for the response
    const { data: order, error: orderError } = await client
      .from('merchandise_orders')
      .select(`
        *,
        items:merchandise_order_items(
          *,
          variant:merchandise_variants(
            *,
            product:merchandise_products(*)
          )
        )
      `)
      .eq('id', result.order_id)
      .single()

    if (orderError) throw orderError

    return { order }
  } catch (error: any) {
    console.error('Create order API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create order'
    })
  }
})
