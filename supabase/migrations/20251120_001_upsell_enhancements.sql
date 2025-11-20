-- Migration: Upsell Enhancements for Product Variants and Order Management
-- Created: 2025-11-20
-- Description: Adds variants, order items, streaming sessions, and enhanced upsell features

-- ============================================
-- ENHANCE UPSELL_ITEMS TABLE
-- ============================================

-- Add missing columns to existing upsell_items table
ALTER TABLE upsell_items
  ADD COLUMN IF NOT EXISTS recital_show_id UUID REFERENCES recital_shows(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS inventory_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS max_quantity_per_order INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ;

-- Update item_type constraint to include new types
ALTER TABLE upsell_items DROP CONSTRAINT IF EXISTS upsell_items_item_type_check;
ALTER TABLE upsell_items
  ADD CONSTRAINT upsell_items_item_type_check
  CHECK (item_type IN ('digital_download', 'dvd', 'merchandise', 'bundle', 'live_stream', 'flowers'));

-- Add index for show_id
CREATE INDEX IF NOT EXISTS idx_upsell_items_show ON upsell_items(recital_show_id);

COMMENT ON COLUMN upsell_items.recital_show_id IS 'Optional link to specific recital show (null = available for all shows in series)';
COMMENT ON COLUMN upsell_items.inventory_quantity IS 'Current inventory count (null = unlimited)';
COMMENT ON COLUMN upsell_items.max_quantity_per_order IS 'Maximum quantity customer can purchase per order';
COMMENT ON COLUMN upsell_items.image_url IS 'Product image URL';

-- ============================================
-- UPSELL ITEM VARIANTS TABLE
-- ============================================
CREATE TABLE upsell_item_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upsell_item_id UUID NOT NULL REFERENCES upsell_items(id) ON DELETE CASCADE,

  -- Variant details
  variant_name TEXT NOT NULL, -- "Small", "Medium", "Large", "Youth XS", "Adult L"
  variant_type TEXT NOT NULL, -- "size", "color", "style"

  -- Pricing (optional override)
  price_override_in_cents INTEGER, -- If NULL, uses parent item price

  -- Inventory
  sku TEXT,
  inventory_quantity INTEGER,

  -- Availability
  is_available BOOLEAN DEFAULT true,

  -- Display
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT variant_price_non_negative CHECK (price_override_in_cents IS NULL OR price_override_in_cents >= 0),
  CONSTRAINT variant_inventory_non_negative CHECK (inventory_quantity IS NULL OR inventory_quantity >= 0)
);

CREATE INDEX idx_upsell_variants_item ON upsell_item_variants(upsell_item_id);
CREATE INDEX idx_upsell_variants_available ON upsell_item_variants(is_available) WHERE is_available = true;

COMMENT ON TABLE upsell_item_variants IS 'Product variants (sizes, colors, etc.) for upsell items';
COMMENT ON COLUMN upsell_item_variants.variant_name IS 'Display name for this variant (e.g., "Small", "Red", "Youth M")';
COMMENT ON COLUMN upsell_item_variants.variant_type IS 'Type of variant: size, color, style, etc.';
COMMENT ON COLUMN upsell_item_variants.price_override_in_cents IS 'Override price for this variant (null = use parent price)';
COMMENT ON COLUMN upsell_item_variants.sku IS 'Stock keeping unit / product code';

-- ============================================
-- UPSELL ORDER ITEMS TABLE
-- ============================================
CREATE TABLE upsell_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  upsell_item_id UUID NOT NULL REFERENCES upsell_items(id),

  -- Variant selection
  variant_id UUID REFERENCES upsell_item_variants(id),

  -- Quantity & pricing
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_in_cents INTEGER NOT NULL,
  total_price_in_cents INTEGER NOT NULL,

  -- Customization
  customization_text TEXT, -- e.g., "Add student name: Emily Smith"

  -- Fulfillment
  fulfillment_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'fulfilled', 'cancelled'
  fulfillment_method TEXT, -- 'pickup', 'shipping', 'digital', 'venue_delivery'

  -- Delivery details (for flowers, etc.)
  delivery_recipient_name TEXT,
  delivery_notes TEXT,

  -- Shipping
  shipping_address_line1 TEXT,
  shipping_address_line2 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_zip TEXT,
  tracking_number TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT order_item_quantity_positive CHECK (quantity > 0),
  CONSTRAINT order_item_prices_positive CHECK (unit_price_in_cents >= 0 AND total_price_in_cents >= 0),
  CONSTRAINT order_item_fulfillment_status_valid CHECK (
    fulfillment_status IN ('pending', 'processing', 'fulfilled', 'cancelled')
  )
);

CREATE INDEX idx_upsell_order_items_order ON upsell_order_items(order_id);
CREATE INDEX idx_upsell_order_items_item ON upsell_order_items(upsell_item_id);
CREATE INDEX idx_upsell_order_items_status ON upsell_order_items(fulfillment_status);
CREATE INDEX idx_upsell_order_items_method ON upsell_order_items(fulfillment_method);

COMMENT ON TABLE upsell_order_items IS 'Upsell products purchased in an order';
COMMENT ON COLUMN upsell_order_items.fulfillment_status IS 'Status of order fulfillment: pending, processing, fulfilled, cancelled';
COMMENT ON COLUMN upsell_order_items.fulfillment_method IS 'How product will be delivered: pickup, shipping, digital, venue_delivery';
COMMENT ON COLUMN upsell_order_items.customization_text IS 'Custom text for personalized products (e.g., student name on t-shirt)';

-- ============================================
-- STREAMING SESSIONS TABLE
-- ============================================
CREATE TABLE streaming_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  upsell_item_id UUID NOT NULL REFERENCES upsell_items(id),

  -- Access details
  access_code TEXT UNIQUE NOT NULL,
  stream_url TEXT NOT NULL,

  -- Timing
  stream_starts_at TIMESTAMPTZ NOT NULL,
  stream_ends_at TIMESTAMPTZ NOT NULL,
  replay_available_until TIMESTAMPTZ,

  -- Usage tracking
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT view_count_non_negative CHECK (view_count >= 0)
);

CREATE INDEX idx_streaming_sessions_order ON streaming_sessions(order_id);
CREATE INDEX idx_streaming_sessions_code ON streaming_sessions(access_code);
CREATE INDEX idx_streaming_sessions_active ON streaming_sessions(is_active) WHERE is_active = true;

COMMENT ON TABLE streaming_sessions IS 'Live stream access sessions for purchased tickets';
COMMENT ON COLUMN streaming_sessions.access_code IS 'Unique code for accessing the stream';
COMMENT ON COLUMN streaming_sessions.stream_url IS 'URL to the live stream (may be YouTube Live, Vimeo, etc.)';
COMMENT ON COLUMN streaming_sessions.replay_available_until IS 'Optional: Date until replay is available (null = no replay)';

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER update_upsell_item_variants_updated_at
  BEFORE UPDATE ON upsell_item_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upsell_order_items_updated_at
  BEFORE UPDATE ON upsell_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streaming_sessions_updated_at
  BEFORE UPDATE ON streaming_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on new tables
ALTER TABLE upsell_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE upsell_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_sessions ENABLE ROW LEVEL SECURITY;

-- Upsell item variants policies
CREATE POLICY "Anyone can view available variants"
  ON upsell_item_variants FOR SELECT
  TO public
  USING (
    is_available = true
    AND EXISTS (
      SELECT 1 FROM upsell_items
      WHERE upsell_items.id = upsell_item_variants.upsell_item_id
      AND upsell_items.is_active = true
    )
  );

CREATE POLICY "Admin and staff can manage variants"
  ON upsell_item_variants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Upsell order items policies
CREATE POLICY "Customers can view their own order items"
  ON upsell_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ticket_orders
      WHERE ticket_orders.id = upsell_order_items.order_id
      AND ticket_orders.customer_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can manage order items"
  ON upsell_order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Streaming sessions policies
CREATE POLICY "Customers can view their own streaming sessions"
  ON streaming_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ticket_orders
      WHERE ticket_orders.id = streaming_sessions.order_id
      AND ticket_orders.customer_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can manage streaming sessions"
  ON streaming_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check upsell item availability
CREATE OR REPLACE FUNCTION check_upsell_availability(
  p_upsell_item_id UUID,
  p_variant_id UUID DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_item RECORD;
  v_variant RECORD;
  v_available_inventory INTEGER;
BEGIN
  -- Get upsell item
  SELECT * INTO v_item
  FROM upsell_items
  WHERE id = p_upsell_item_id;

  -- Check if item exists and is active
  IF v_item IS NULL OR v_item.is_active = false THEN
    RETURN false;
  END IF;

  -- Check availability window
  IF v_item.available_from IS NOT NULL AND NOW() < v_item.available_from THEN
    RETURN false;
  END IF;

  IF v_item.available_until IS NOT NULL AND NOW() > v_item.available_until THEN
    RETURN false;
  END IF;

  -- Check max quantity
  IF p_quantity > v_item.max_quantity_per_order THEN
    RETURN false;
  END IF;

  -- If variant specified, check variant availability
  IF p_variant_id IS NOT NULL THEN
    SELECT * INTO v_variant
    FROM upsell_item_variants
    WHERE id = p_variant_id AND upsell_item_id = p_upsell_item_id;

    IF v_variant IS NULL OR v_variant.is_available = false THEN
      RETURN false;
    END IF;

    -- Check variant inventory
    IF v_variant.inventory_quantity IS NOT NULL THEN
      IF v_variant.inventory_quantity < p_quantity THEN
        RETURN false;
      END IF;
    END IF;
  ELSE
    -- Check item inventory (no variant)
    IF v_item.inventory_quantity IS NOT NULL THEN
      IF v_item.inventory_quantity < p_quantity THEN
        RETURN false;
      END IF;
    END IF;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION check_upsell_availability IS 'Checks if an upsell item (and optional variant) is available for purchase in the requested quantity';
