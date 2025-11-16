-- Merchandise Order Creation Transaction Function
-- This function creates an order atomically with proper inventory validation

CREATE OR REPLACE FUNCTION create_merchandise_order(
  p_user_id UUID,
  p_customer_name VARCHAR,
  p_email VARCHAR,
  p_phone VARCHAR,
  p_fulfillment_method VARCHAR,
  p_shipping_address JSONB,
  p_notes TEXT,
  p_items JSONB -- Array of {variant_id, quantity}
)
RETURNS TABLE (
  order_id UUID,
  order_number VARCHAR,
  total_in_cents INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_order_id UUID;
  v_order_number VARCHAR;
  v_subtotal INTEGER := 0;
  v_tax INTEGER;
  v_shipping INTEGER;
  v_total INTEGER;
  v_item JSONB;
  v_variant RECORD;
  v_inventory RECORD;
  v_unit_price INTEGER;
  v_available_stock INTEGER;
BEGIN
  -- Validate items array is not empty
  IF jsonb_array_length(p_items) = 0 THEN
    RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR, NULL::INTEGER, 'No items provided'::TEXT;
    RETURN;
  END IF;

  -- Validate and calculate prices from database
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Get variant with product details
    SELECT
      mv.id,
      mv.product_id,
      mv.sku,
      mv.size,
      mv.color,
      mv.price_adjustment_in_cents,
      mv.is_available,
      mp.name AS product_name,
      mp.description AS product_description,
      mp.base_price_in_cents,
      mp.image_url,
      mp.is_active AS product_is_active
    INTO v_variant
    FROM merchandise_variants mv
    JOIN merchandise_products mp ON mv.product_id = mp.id
    WHERE mv.id = (v_item->>'variant_id')::UUID;

    -- Check if variant exists
    IF NOT FOUND THEN
      RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR, NULL::INTEGER,
        ('Variant not found: ' || (v_item->>'variant_id'))::TEXT;
      RETURN;
    END IF;

    -- Check if product and variant are active/available
    IF NOT v_variant.product_is_active OR NOT v_variant.is_available THEN
      RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR, NULL::INTEGER,
        ('Product not available: ' || v_variant.product_name)::TEXT;
      RETURN;
    END IF;

    -- Get inventory with FOR UPDATE to lock the row
    SELECT
      quantity_on_hand,
      quantity_reserved
    INTO v_inventory
    FROM merchandise_inventory
    WHERE variant_id = (v_item->>'variant_id')::UUID
    FOR UPDATE;

    -- Check if inventory record exists
    IF NOT FOUND THEN
      RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR, NULL::INTEGER,
        ('No inventory record for: ' || v_variant.product_name)::TEXT;
      RETURN;
    END IF;

    -- Calculate available stock
    v_available_stock := v_inventory.quantity_on_hand - v_inventory.quantity_reserved;

    -- Validate stock availability
    IF v_available_stock < (v_item->>'quantity')::INTEGER THEN
      RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR, NULL::INTEGER,
        ('Insufficient stock for: ' || v_variant.product_name || '. Only ' || v_available_stock || ' available')::TEXT;
      RETURN;
    END IF;

    -- Calculate price from database (never trust client)
    v_unit_price := v_variant.base_price_in_cents + v_variant.price_adjustment_in_cents;
    v_subtotal := v_subtotal + (v_unit_price * (v_item->>'quantity')::INTEGER);
  END LOOP;

  -- Calculate tax and shipping
  v_tax := ROUND(v_subtotal * 0.08); -- 8% tax
  v_shipping := CASE WHEN p_fulfillment_method = 'shipping' THEN 1000 ELSE 0 END;
  v_total := v_subtotal + v_tax + v_shipping;

  -- Generate order number
  v_order_number := generate_order_number();

  -- Create the order
  INSERT INTO merchandise_orders (
    user_id,
    order_number,
    customer_name,
    email,
    phone,
    subtotal_in_cents,
    tax_in_cents,
    shipping_cost_in_cents,
    total_in_cents,
    payment_method,
    payment_status,
    fulfillment_method,
    shipping_address,
    order_status,
    notes
  ) VALUES (
    p_user_id,
    v_order_number,
    p_customer_name,
    p_email,
    p_phone,
    v_subtotal,
    v_tax,
    v_shipping,
    v_total,
    'stripe',
    'pending',
    p_fulfillment_method,
    p_shipping_address,
    'pending',
    p_notes
  )
  RETURNING id INTO v_order_id;

  -- Create order items and reserve inventory
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Get variant details again for order item
    SELECT
      mv.id,
      mv.sku,
      mv.size,
      mv.color,
      mv.price_adjustment_in_cents,
      mp.name AS product_name,
      mp.description AS product_description,
      mp.base_price_in_cents,
      mp.image_url
    INTO v_variant
    FROM merchandise_variants mv
    JOIN merchandise_products mp ON mv.product_id = mp.id
    WHERE mv.id = (v_item->>'variant_id')::UUID;

    -- Calculate unit price
    v_unit_price := v_variant.base_price_in_cents + v_variant.price_adjustment_in_cents;

    -- Insert order item
    INSERT INTO merchandise_order_items (
      order_id,
      variant_id,
      product_snapshot,
      quantity,
      unit_price_in_cents,
      total_price_in_cents
    ) VALUES (
      v_order_id,
      (v_item->>'variant_id')::UUID,
      jsonb_build_object(
        'product_name', v_variant.product_name,
        'product_description', v_variant.product_description,
        'variant_size', v_variant.size,
        'variant_color', v_variant.color,
        'variant_sku', v_variant.sku,
        'image_url', v_variant.image_url
      ),
      (v_item->>'quantity')::INTEGER,
      v_unit_price,
      v_unit_price * (v_item->>'quantity')::INTEGER
    );

    -- Reserve inventory (atomic update with row lock from earlier FOR UPDATE)
    UPDATE merchandise_inventory
    SET quantity_reserved = quantity_reserved + (v_item->>'quantity')::INTEGER
    WHERE variant_id = (v_item->>'variant_id')::UUID;
  END LOOP;

  -- Return success
  RETURN QUERY SELECT v_order_id, v_order_number, v_total, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_merchandise_order TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_merchandise_order IS
'Creates a merchandise order atomically with proper inventory validation and price calculation from database';
