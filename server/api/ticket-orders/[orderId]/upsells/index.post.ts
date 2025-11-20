// POST /api/ticket-orders/[orderId]/upsells
// Add an upsell item to an order

import type { AddUpsellToOrderInput, UpsellOrderItem } from '~/types/ticketing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const orderId = event.context.params?.orderId
  const body = await readBody(event) as AddUpsellToOrderInput

  if (!orderId) {
    throw createError({
      statusCode: 400,
      message: 'Order ID is required'
    })
  }

  // Validate required fields
  if (!body.upsell_item_id || !body.quantity || body.quantity <= 0) {
    throw createError({
      statusCode: 400,
      message: 'Missing or invalid required fields: upsell_item_id, quantity'
    })
  }

  // Get upsell item details with variants
  const { data: upsellItem, error: itemError } = await client
    .from('upsell_items')
    .select('*, upsell_item_variants(*)')
    .eq('id', body.upsell_item_id)
    .single()

  if (itemError || !upsellItem) {
    throw createError({
      statusCode: 404,
      message: 'Upsell item not found'
    })
  }

  // Check availability using the helper function
  const { data: isAvailable, error: availError } = await client
    .rpc('check_upsell_availability', {
      p_upsell_item_id: body.upsell_item_id,
      p_variant_id: body.variant_id || null,
      p_quantity: body.quantity
    })

  if (availError) {
    console.error('Error checking availability:', availError)
    throw createError({
      statusCode: 400,
      message: 'Error checking item availability'
    })
  }

  if (!isAvailable) {
    throw createError({
      statusCode: 400,
      message: 'Item is not available in the requested quantity'
    })
  }

  // Calculate price
  let unitPrice = upsellItem.price_in_cents
  if (body.variant_id) {
    const variant = upsellItem.upsell_item_variants?.find((v: any) => v.id === body.variant_id)
    if (!variant) {
      throw createError({
        statusCode: 404,
        message: 'Variant not found'
      })
    }
    if (variant.price_override_in_cents !== null) {
      unitPrice = variant.price_override_in_cents
    }
  }

  const totalPrice = unitPrice * body.quantity

  // Determine fulfillment method based on item type
  let fulfillmentMethod: string | null = null
  if (upsellItem.item_type === 'digital_download' || upsellItem.item_type === 'live_stream') {
    fulfillmentMethod = 'digital'
  } else if (body.shipping_address) {
    fulfillmentMethod = 'shipping'
  } else if (upsellItem.item_type === 'flowers') {
    fulfillmentMethod = 'venue_delivery'
  } else {
    fulfillmentMethod = 'pickup'
  }

  // Create order item
  const { data: orderItem, error: orderError } = await client
    .from('upsell_order_items')
    .insert({
      order_id: orderId,
      upsell_item_id: body.upsell_item_id,
      variant_id: body.variant_id || null,
      quantity: body.quantity,
      unit_price_in_cents: unitPrice,
      total_price_in_cents: totalPrice,
      customization_text: body.customization_text || null,
      delivery_recipient_name: body.delivery_recipient_name || null,
      delivery_notes: body.delivery_notes || null,
      fulfillment_method: fulfillmentMethod,
      fulfillment_status: 'pending',
      shipping_address_line1: body.shipping_address?.line1 || null,
      shipping_address_line2: body.shipping_address?.line2 || null,
      shipping_city: body.shipping_address?.city || null,
      shipping_state: body.shipping_address?.state || null,
      shipping_zip: body.shipping_address?.zip || null
    })
    .select()
    .single()

  if (orderError) {
    console.error('Error creating order item:', orderError)
    throw createError({
      statusCode: 400,
      message: orderError.message
    })
  }

  // Update order total
  const { data: order } = await client
    .from('ticket_orders')
    .select('total_amount_in_cents')
    .eq('id', orderId)
    .single()

  if (order) {
    await client
      .from('ticket_orders')
      .update({
        total_amount_in_cents: order.total_amount_in_cents + totalPrice
      })
      .eq('id', orderId)
  }

  // Decrement inventory
  if (body.variant_id) {
    // Decrement variant inventory
    const variant = upsellItem.upsell_item_variants?.find((v: any) => v.id === body.variant_id)
    if (variant && variant.inventory_quantity !== null) {
      await client
        .from('upsell_item_variants')
        .update({
          inventory_quantity: variant.inventory_quantity - body.quantity
        })
        .eq('id', body.variant_id)
    }
  } else {
    // Decrement item inventory
    if (upsellItem.inventory_quantity !== null) {
      await client
        .from('upsell_items')
        .update({
          inventory_quantity: upsellItem.inventory_quantity - body.quantity
        })
        .eq('id', body.upsell_item_id)
    }
  }

  return {
    success: true,
    order_item: orderItem as UpsellOrderItem
  }
})
