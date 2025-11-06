-- Merchandise Management Schema Migration
-- This migration creates all tables needed for the studio merchandise store

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create or replace the function that updates the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE: merchandise_products
-- Stores product information for studio merchandise
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.merchandise_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR NOT NULL,
    base_price_in_cents INTEGER NOT NULL,
    image_url TEXT,
    additional_images JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_merchandise_products_category
ON public.merchandise_products(category);

CREATE INDEX IF NOT EXISTS idx_merchandise_products_is_active
ON public.merchandise_products(is_active);

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_merchandise_products_updated_at ON public.merchandise_products;
CREATE TRIGGER update_merchandise_products_updated_at
BEFORE UPDATE ON public.merchandise_products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT SELECT ON public.merchandise_products TO authenticated;
GRANT SELECT ON public.merchandise_products TO anon;
GRANT INSERT, UPDATE, DELETE ON public.merchandise_products TO authenticated;

-- ============================================================================
-- TABLE: merchandise_variants
-- Stores size/color variants for products
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.merchandise_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.merchandise_products(id) ON DELETE CASCADE,
    sku VARCHAR UNIQUE,
    size VARCHAR,
    color VARCHAR,
    price_adjustment_in_cents INTEGER NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_merchandise_variants_product_id
ON public.merchandise_variants(product_id);

CREATE INDEX IF NOT EXISTS idx_merchandise_variants_sku
ON public.merchandise_variants(sku);

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_merchandise_variants_updated_at ON public.merchandise_variants;
CREATE TRIGGER update_merchandise_variants_updated_at
BEFORE UPDATE ON public.merchandise_variants
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT SELECT ON public.merchandise_variants TO authenticated;
GRANT SELECT ON public.merchandise_variants TO anon;
GRANT INSERT, UPDATE, DELETE ON public.merchandise_variants TO authenticated;

-- ============================================================================
-- TABLE: merchandise_inventory
-- Tracks stock levels for product variants
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.merchandise_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID NOT NULL UNIQUE REFERENCES public.merchandise_variants(id) ON DELETE CASCADE,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_merchandise_inventory_updated_at ON public.merchandise_inventory;
CREATE TRIGGER update_merchandise_inventory_updated_at
BEFORE UPDATE ON public.merchandise_inventory
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT SELECT ON public.merchandise_inventory TO authenticated;
GRANT SELECT ON public.merchandise_inventory TO anon;
GRANT INSERT, UPDATE, DELETE ON public.merchandise_inventory TO authenticated;

-- ============================================================================
-- TABLE: merchandise_orders
-- Stores customer orders for merchandise
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.merchandise_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    order_number VARCHAR NOT NULL UNIQUE,
    customer_name VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    phone VARCHAR,
    subtotal_in_cents INTEGER NOT NULL,
    tax_in_cents INTEGER NOT NULL DEFAULT 0,
    shipping_cost_in_cents INTEGER NOT NULL DEFAULT 0,
    total_in_cents INTEGER NOT NULL,
    payment_method VARCHAR NOT NULL DEFAULT 'stripe',
    payment_intent_id VARCHAR,
    payment_status VARCHAR NOT NULL DEFAULT 'pending',
    fulfillment_method VARCHAR NOT NULL,
    shipping_address JSONB,
    order_status VARCHAR NOT NULL DEFAULT 'pending',
    order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_merchandise_orders_user_id
ON public.merchandise_orders(user_id);

CREATE INDEX IF NOT EXISTS idx_merchandise_orders_order_number
ON public.merchandise_orders(order_number);

CREATE INDEX IF NOT EXISTS idx_merchandise_orders_email
ON public.merchandise_orders(email);

CREATE INDEX IF NOT EXISTS idx_merchandise_orders_payment_status
ON public.merchandise_orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_merchandise_orders_order_status
ON public.merchandise_orders(order_status);

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_merchandise_orders_updated_at ON public.merchandise_orders;
CREATE TRIGGER update_merchandise_orders_updated_at
BEFORE UPDATE ON public.merchandise_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT SELECT ON public.merchandise_orders TO authenticated;
GRANT INSERT, UPDATE ON public.merchandise_orders TO authenticated;

-- ============================================================================
-- TABLE: merchandise_order_items
-- Individual items within an order
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.merchandise_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.merchandise_orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.merchandise_variants(id),
    product_snapshot JSONB NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_in_cents INTEGER NOT NULL,
    total_price_in_cents INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_merchandise_order_items_order_id
ON public.merchandise_order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_merchandise_order_items_variant_id
ON public.merchandise_order_items(variant_id);

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_merchandise_order_items_updated_at ON public.merchandise_order_items;
CREATE TRIGGER update_merchandise_order_items_updated_at
BEFORE UPDATE ON public.merchandise_order_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT SELECT ON public.merchandise_order_items TO authenticated;
GRANT INSERT ON public.merchandise_order_items TO authenticated;

-- ============================================================================
-- FUNCTION: generate_order_number
-- Generates unique order numbers in format MO{YY}-{NNNN}
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
DECLARE
    new_number VARCHAR;
    year_part VARCHAR;
    sequence_part VARCHAR;
    max_sequence INTEGER;
BEGIN
    -- Get current year
    year_part := TO_CHAR(NOW(), 'YY');

    -- Get the maximum sequence number for the current year
    SELECT COALESCE(MAX(
        CASE
            WHEN order_number ~ ('^MO' || year_part || '-[0-9]{4}$')
            THEN CAST(SUBSTRING(order_number FROM 6) AS INTEGER)
            ELSE 0
        END
    ), 0) INTO max_sequence
    FROM public.merchandise_orders
    WHERE order_number LIKE 'MO' || year_part || '-%';

    -- Increment and format
    sequence_part := LPAD((max_sequence + 1)::TEXT, 4, '0');

    -- Combine parts
    new_number := 'MO' || year_part || '-' || sequence_part;

    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- Add helpful comments to tables and columns
-- ============================================================================

COMMENT ON TABLE public.merchandise_products IS 'Stores product information for studio merchandise';
COMMENT ON TABLE public.merchandise_variants IS 'Stores size/color variants for products';
COMMENT ON TABLE public.merchandise_inventory IS 'Tracks stock levels for product variants';
COMMENT ON TABLE public.merchandise_orders IS 'Stores customer orders for merchandise';
COMMENT ON TABLE public.merchandise_order_items IS 'Individual items within an order';

COMMENT ON COLUMN public.merchandise_products.base_price_in_cents IS 'Base price in cents (before variant adjustments)';
COMMENT ON COLUMN public.merchandise_products.additional_images IS 'Array of additional image URLs stored as JSONB';
COMMENT ON COLUMN public.merchandise_variants.price_adjustment_in_cents IS 'Price adjustment from base price (can be positive or negative)';
COMMENT ON COLUMN public.merchandise_inventory.quantity_reserved IS 'Quantity in active carts/pending orders';
COMMENT ON COLUMN public.merchandise_orders.fulfillment_method IS 'pickup or shipping';
COMMENT ON COLUMN public.merchandise_orders.payment_status IS 'pending, completed, failed, or refunded';
COMMENT ON COLUMN public.merchandise_orders.order_status IS 'pending, processing, ready, completed, or cancelled';
COMMENT ON COLUMN public.merchandise_order_items.product_snapshot IS 'Snapshot of product/variant details at time of order';
