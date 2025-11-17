-- Migration: Ticketing Upsells & Digital Products
-- Created: 2025-11-16
-- Description: Creates tables for upsell items, digital media, and access codes

-- ============================================
-- UPSELL ITEMS TABLE
-- ============================================
CREATE TABLE upsell_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recital_series_id UUID REFERENCES recital_series(id) ON DELETE CASCADE,

  -- Item details
  name TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL
    CHECK (item_type IN ('digital_download', 'dvd', 'merchandise', 'bundle')),
  price_in_cents INTEGER NOT NULL,

  -- Display settings
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT upsell_price_positive CHECK (price_in_cents >= 0)
);

COMMENT ON TABLE upsell_items IS 'Upsell products available for purchase with tickets (DVDs, digital downloads, merchandise)';
COMMENT ON COLUMN upsell_items.recital_series_id IS 'Optional link to specific recital series (null = available for all)';
COMMENT ON COLUMN upsell_items.item_type IS 'Type of upsell: digital_download, dvd, merchandise, bundle';
COMMENT ON COLUMN upsell_items.is_active IS 'Whether this item is currently available for purchase';
COMMENT ON COLUMN upsell_items.display_order IS 'Order in which items should be displayed during checkout';

-- ============================================
-- MEDIA ITEMS TABLE
-- ============================================
CREATE TABLE media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recital_series_id UUID NOT NULL REFERENCES recital_series(id) ON DELETE CASCADE,

  -- Media details
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT, -- Supabase Storage URL
  duration_seconds INTEGER,
  file_size_mb NUMERIC(10, 2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE media_items IS 'Digital media files (videos, photos) available for download after purchase';
COMMENT ON COLUMN media_items.file_url IS 'Supabase Storage URL for the media file';
COMMENT ON COLUMN media_items.duration_seconds IS 'Duration in seconds (for video files)';
COMMENT ON COLUMN media_items.file_size_mb IS 'File size in megabytes';

-- ============================================
-- MEDIA ACCESS CODES TABLE
-- ============================================
CREATE TABLE media_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_order_id UUID NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,

  -- Access control
  access_code TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE media_access_codes IS 'Access codes for digital media downloads tied to ticket orders';
COMMENT ON COLUMN media_access_codes.access_code IS 'Unique code for accessing digital media';
COMMENT ON COLUMN media_access_codes.expires_at IS 'Optional expiration date for access code';

-- ============================================
-- MEDIA ACCESS GRANTS TABLE
-- ============================================
CREATE TABLE media_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_code_id UUID NOT NULL REFERENCES media_access_codes(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,

  -- Access tracking
  accessed_at TIMESTAMPTZ, -- when first accessed
  download_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT download_count_non_negative CHECK (download_count >= 0)
);

COMMENT ON TABLE media_access_grants IS 'Links access codes to specific media items with download tracking';
COMMENT ON COLUMN media_access_grants.accessed_at IS 'Timestamp when media was first accessed';
COMMENT ON COLUMN media_access_grants.download_count IS 'Number of times media has been downloaded';

-- ============================================
-- INDEXES
-- ============================================

-- Upsell items indexes
CREATE INDEX idx_upsell_items_series ON upsell_items(recital_series_id);
CREATE INDEX idx_upsell_items_active ON upsell_items(is_active)
  WHERE is_active = true;
CREATE INDEX idx_upsell_items_display ON upsell_items(display_order);

-- Media items indexes
CREATE INDEX idx_media_items_series ON media_items(recital_series_id);

-- Media access codes indexes
CREATE INDEX idx_media_access_codes_order ON media_access_codes(ticket_order_id);
CREATE INDEX idx_media_access_codes_code ON media_access_codes(access_code);
CREATE INDEX idx_media_access_codes_expires ON media_access_codes(expires_at)
  WHERE expires_at IS NOT NULL;

-- Media access grants indexes
CREATE INDEX idx_media_access_grants_code ON media_access_grants(access_code_id);
CREATE INDEX idx_media_access_grants_media ON media_access_grants(media_item_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER update_upsell_items_updated_at
  BEFORE UPDATE ON upsell_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE upsell_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_access_grants ENABLE ROW LEVEL SECURITY;

-- Upsell items policies
CREATE POLICY "Anyone can view active upsell items"
  ON upsell_items FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admin and staff can view all upsell items"
  ON upsell_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can manage upsell items"
  ON upsell_items FOR INSERT, UPDATE, DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Media items policies
CREATE POLICY "Admin and staff can view all media items"
  ON media_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can manage media items"
  ON media_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Media access codes policies
CREATE POLICY "Customers can view their own access codes"
  ON media_access_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ticket_orders
      WHERE ticket_orders.id = media_access_codes.ticket_order_id
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

CREATE POLICY "Admin and staff can manage access codes"
  ON media_access_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Media access grants policies
CREATE POLICY "Customers can view their own access grants"
  ON media_access_grants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM media_access_codes
      JOIN ticket_orders ON ticket_orders.id = media_access_codes.ticket_order_id
      WHERE media_access_codes.id = media_access_grants.access_code_id
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

CREATE POLICY "Admin and staff can manage access grants"
  ON media_access_grants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );
