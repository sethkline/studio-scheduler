import { getSupabaseClient } from '../../../utils/supabase'

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

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + (item.unit_price_in_cents * item.quantity)
    }, 0)

    const tax = Math.round(subtotal * 0.08) // 8% tax
    const shipping = checkout.fulfillment_method === 'shipping' ? 1000 : 0 // $10 flat rate
    const total = subtotal + tax + shipping

    // Generate order number using the database function
    const { data: orderNumberData, error: orderNumberError } = await client
      .rpc('generate_order_number')

    if (orderNumberError) throw orderNumberError

    // Create the order
    const { data: order, error: orderError } = await client
      .from('merchandise_orders')
      .insert({
        user_id: user?.id || null,
        order_number: orderNumberData,
        customer_name: checkout.customer_name,
        email: checkout.email,
        phone: checkout.phone,
        subtotal_in_cents: subtotal,
        tax_in_cents: tax,
        shipping_cost_in_cents: shipping,
        total_in_cents: total,
        payment_method: 'stripe',
        payment_status: 'pending',
        fulfillment_method: checkout.fulfillment_method,
        shipping_address: checkout.shipping_address || null,
        order_status: 'pending',
        notes: checkout.notes
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      variant_id: item.variant_id,
      product_snapshot: {
        product_name: item.product_name,
        variant_size: item.variant_size,
        variant_color: item.variant_color,
        image_url: item.image_url
      },
      quantity: item.quantity,
      unit_price_in_cents: item.unit_price_in_cents,
      total_price_in_cents: item.unit_price_in_cents * item.quantity
    }))

    const { error: itemsError } = await client
      .from('merchandise_order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    // Reserve inventory for each item
    for (const item of items) {
      const { data: inventory, error: invError } = await client
        .from('merchandise_inventory')
        .select('*')
        .eq('variant_id', item.variant_id)
        .single()

      if (invError) continue // Skip if inventory record not found

      await client
        .from('merchandise_inventory')
        .update({
          quantity_reserved: inventory.quantity_reserved + item.quantity
        })
        .eq('variant_id', item.variant_id)
    }

    return { order }
  } catch (error) {
    console.error('Create order API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create order'
    })
  }
})
