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

    // Validate that items only contain variant_id and quantity (don't trust prices from client)
    const validatedItems = items.map((item: any) => ({
      variant_id: item.variant_id,
      quantity: parseInt(item.quantity, 10)
    }))

    // Validate quantities are positive integers
    if (validatedItems.some((item: any) => !item.variant_id || item.quantity <= 0 || !Number.isInteger(item.quantity))) {
      return createError({
        statusCode: 400,
        statusMessage: 'Invalid item data: quantity must be a positive integer'
      })
    }

    // Fetch variant details with pricing and inventory from database
    const variantIds = validatedItems.map((item: any) => item.variant_id)
    const { data: variants, error: variantsError } = await client
      .from('merchandise_variants')
      .select(`
        id,
        product_id,
        sku,
        size,
        color,
        price_adjustment_in_cents,
        is_available,
        product:merchandise_products(
          id,
          name,
          description,
          base_price_in_cents,
          image_url,
          is_active
        ),
        inventory:merchandise_inventory(
          quantity_on_hand,
          quantity_reserved
        )
      `)
      .in('id', variantIds)

    if (variantsError) throw variantsError

    if (!variants || variants.length !== validatedItems.length) {
      return createError({
        statusCode: 400,
        statusMessage: 'One or more products not found'
      })
    }

    // Build a map of variants for quick lookup
    const variantMap = new Map()
    variants.forEach((v: any) => variantMap.set(v.id, v))

    // Validate inventory and calculate prices from database
    let subtotal = 0
    const validatedOrderItems: any[] = []

    for (const item of validatedItems) {
      const variant = variantMap.get(item.variant_id)

      if (!variant) {
        return createError({
          statusCode: 400,
          statusMessage: `Product variant ${item.variant_id} not found`
        })
      }

      // Check if product and variant are active/available
      if (!variant.product.is_active || !variant.is_available) {
        return createError({
          statusCode: 400,
          statusMessage: `Product "${variant.product.name}" is not available for purchase`
        })
      }

      // Validate inventory availability
      if (!variant.inventory || variant.inventory.length === 0) {
        return createError({
          statusCode: 400,
          statusMessage: `No inventory record found for product "${variant.product.name}"`
        })
      }

      const inventory = variant.inventory[0]
      const availableStock = inventory.quantity_on_hand - inventory.quantity_reserved

      if (availableStock < item.quantity) {
        return createError({
          statusCode: 400,
          statusMessage: `Insufficient stock for product "${variant.product.name}". Only ${availableStock} available.`
        })
      }

      // Calculate actual price from database (never trust client)
      const unitPrice = variant.product.base_price_in_cents + variant.price_adjustment_in_cents
      const itemTotal = unitPrice * item.quantity

      subtotal += itemTotal

      validatedOrderItems.push({
        variant_id: item.variant_id,
        variant,
        quantity: item.quantity,
        unit_price_in_cents: unitPrice,
        total_price_in_cents: itemTotal
      })
    }

    // Calculate tax and shipping
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

    // Create order items with database-validated prices
    const orderItemsToInsert = validatedOrderItems.map((item) => ({
      order_id: order.id,
      variant_id: item.variant_id,
      product_snapshot: {
        product_name: item.variant.product.name,
        product_description: item.variant.product.description,
        variant_size: item.variant.size,
        variant_color: item.variant.color,
        variant_sku: item.variant.sku,
        image_url: item.variant.product.image_url
      },
      quantity: item.quantity,
      unit_price_in_cents: item.unit_price_in_cents,
      total_price_in_cents: item.total_price_in_cents
    }))

    const { error: itemsError } = await client
      .from('merchandise_order_items')
      .insert(orderItemsToInsert)

    if (itemsError) {
      // Rollback: delete the order if items insertion fails
      await client.from('merchandise_orders').delete().eq('id', order.id)
      throw itemsError
    }

    // Reserve inventory for each item with optimistic locking
    for (const item of validatedOrderItems) {
      const currentInventory = item.variant.inventory[0]

      // Use update with conditions to prevent race conditions
      const { data: updatedInventory, error: invError } = await client
        .from('merchandise_inventory')
        .update({
          quantity_reserved: currentInventory.quantity_reserved + item.quantity
        })
        .eq('variant_id', item.variant_id)
        // Ensure the quantity hasn't changed since we checked (optimistic locking)
        .eq('quantity_reserved', currentInventory.quantity_reserved)
        .select()
        .single()

      if (invError || !updatedInventory) {
        // Rollback: delete order items and order if inventory reservation fails
        await client.from('merchandise_order_items').delete().eq('order_id', order.id)
        await client.from('merchandise_orders').delete().eq('id', order.id)

        return createError({
          statusCode: 409,
          statusMessage: 'Inventory changed during checkout. Please try again.'
        })
      }
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
