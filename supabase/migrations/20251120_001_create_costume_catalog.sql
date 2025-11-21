-- =====================================================
-- Costume Catalog Management System
-- =====================================================
-- This migration creates the costume catalog infrastructure
-- for managing vendor costume data and assignments to performances.
--
-- Features:
-- - Multi-vendor support
-- - Global costume catalog (shared across studios)
-- - Tenant-scoped costume assignments
-- - Size and color variants
-- - Image galleries
-- - Raw data storage for debugging
-- =====================================================

-- =====================================================
-- 1. VENDORS TABLE
-- =====================================================
-- Tracks costume vendors and their configuration
CREATE TABLE IF NOT EXISTS vendors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  website_url     TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_global       BOOLEAN NOT NULL DEFAULT TRUE, -- Global vendors available to all studios
  sync_enabled    BOOLEAN NOT NULL DEFAULT FALSE, -- Whether automated sync is enabled
  last_sync_at    TIMESTAMPTZ,
  sync_frequency  TEXT DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly', 'manual'
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add updated_at trigger
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. COSTUMES TABLE
-- =====================================================
-- Global costume catalog from all vendors
CREATE TABLE IF NOT EXISTS costumes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  vendor_sku      TEXT NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT, -- 'ballet', 'jazz', 'tap', 'lyrical', 'hip-hop', 'costume', 'accessory'
  description     TEXT,
  season          TEXT, -- '2025', 'Spring 2025', 'Fall 2024'
  gender          TEXT, -- 'girls', 'boys', 'unisex', 'adult-female', 'adult-male'
  price_cents     INTEGER, -- null if pricing not available
  currency        TEXT DEFAULT 'USD',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  availability    TEXT DEFAULT 'unknown', -- 'in_stock', 'limited', 'discontinued', 'pre-order', 'unknown'
  min_age         INTEGER, -- Minimum recommended age
  max_age         INTEGER, -- Maximum recommended age
  raw_source_id   UUID, -- FK to raw_vendor_items for debugging
  metadata        JSONB DEFAULT '{}'::jsonb, -- Additional vendor-specific data
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vendor_id, vendor_sku)
);

-- Add indexes
CREATE INDEX idx_costumes_vendor_id ON costumes(vendor_id);
CREATE INDEX idx_costumes_category ON costumes(category);
CREATE INDEX idx_costumes_season ON costumes(season);
CREATE INDEX idx_costumes_is_active ON costumes(is_active);
CREATE INDEX idx_costumes_name_search ON costumes USING gin(to_tsvector('english', name));
CREATE INDEX idx_costumes_metadata ON costumes USING gin(metadata);

-- Add updated_at trigger
CREATE TRIGGER update_costumes_updated_at
  BEFORE UPDATE ON costumes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. COSTUME SIZES TABLE
-- =====================================================
-- Size variants for each costume
CREATE TABLE IF NOT EXISTS costume_sizes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  costume_id  UUID NOT NULL REFERENCES costumes(id) ON DELETE CASCADE,
  code        TEXT NOT NULL, -- 'SC', 'IC', 'MC', 'LC', 'SA', 'IA', 'MA', 'LA', 'XLA'
  label       TEXT NOT NULL, -- 'Small Child', 'Intermediate Child', etc.
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_costume_sizes_costume_id ON costume_sizes(costume_id);
CREATE UNIQUE INDEX idx_costume_sizes_unique ON costume_sizes(costume_id, code);

-- =====================================================
-- 4. COSTUME COLORS TABLE
-- =====================================================
-- Color variants for each costume
CREATE TABLE IF NOT EXISTS costume_colors (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  costume_id  UUID NOT NULL REFERENCES costumes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL, -- 'Black', 'Royal Blue', 'Red'
  swatch_hex  TEXT, -- '#000000', optional hex color
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_costume_colors_costume_id ON costume_colors(costume_id);

-- =====================================================
-- 5. COSTUME IMAGES TABLE
-- =====================================================
-- Image gallery for each costume
CREATE TABLE IF NOT EXISTS costume_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  costume_id  UUID NOT NULL REFERENCES costumes(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  storage_path TEXT, -- Supabase storage path if locally stored
  alt_text    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_costume_images_costume_id ON costume_images(costume_id);

-- =====================================================
-- 6. RAW VENDOR ITEMS TABLE
-- =====================================================
-- Stores raw scraping/import data for debugging and reprocessing
CREATE TABLE IF NOT EXISTS raw_vendor_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id    UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  vendor_sku   TEXT NOT NULL,
  payload      JSONB NOT NULL,
  source_url   TEXT,
  storage_path TEXT, -- Path to raw HTML/PDF in Supabase storage
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed    BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ
);

-- Add indexes
CREATE INDEX idx_raw_vendor_items_vendor_id ON raw_vendor_items(vendor_id);
CREATE INDEX idx_raw_vendor_items_vendor_sku ON raw_vendor_items(vendor_id, vendor_sku);
CREATE INDEX idx_raw_vendor_items_fetched_at ON raw_vendor_items(fetched_at DESC);

-- =====================================================
-- 7. PERFORMANCE COSTUMES TABLE (Tenant-Scoped)
-- =====================================================
-- Links costumes to recital performances with tenant isolation
CREATE TABLE IF NOT EXISTS performance_costumes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id        UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  performance_id   UUID NOT NULL REFERENCES recital_performances(id) ON DELETE CASCADE,
  costume_id       UUID NOT NULL REFERENCES costumes(id) ON DELETE RESTRICT,
  is_primary       BOOLEAN NOT NULL DEFAULT TRUE,
  notes            TEXT, -- e.g., "Includes tights and hair accessories"
  quantity_needed  INTEGER, -- Number of this costume needed for performance
  order_status     TEXT DEFAULT 'not_ordered', -- 'not_ordered', 'pending', 'ordered', 'received'
  ordered_at       TIMESTAMPTZ,
  received_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_performance_costumes_studio_id ON performance_costumes(studio_id);
CREATE INDEX idx_performance_costumes_performance_id ON performance_costumes(performance_id);
CREATE INDEX idx_performance_costumes_costume_id ON performance_costumes(costume_id);
CREATE UNIQUE INDEX idx_performance_costumes_unique ON performance_costumes(performance_id, costume_id);

-- Add updated_at trigger
CREATE TRIGGER update_performance_costumes_updated_at
  BEFORE UPDATE ON performance_costumes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. COSTUME ORDER DETAILS TABLE (Optional - For Size Tracking)
-- =====================================================
-- Tracks specific size/color orders per performance costume
CREATE TABLE IF NOT EXISTS costume_order_details (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  performance_costume_id  UUID NOT NULL REFERENCES performance_costumes(id) ON DELETE CASCADE,
  costume_size_id         UUID REFERENCES costume_sizes(id) ON DELETE SET NULL,
  costume_color_id        UUID REFERENCES costume_colors(id) ON DELETE SET NULL,
  quantity                INTEGER NOT NULL DEFAULT 1,
  student_id              UUID REFERENCES students(id) ON DELETE SET NULL, -- Optional: track which student
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_costume_order_details_performance_costume_id ON costume_order_details(performance_costume_id);
CREATE INDEX idx_costume_order_details_student_id ON costume_order_details(student_id);

-- Add updated_at trigger
CREATE TRIGGER update_costume_order_details_updated_at
  BEFORE UPDATE ON costume_order_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. VENDOR SYNC LOGS TABLE
-- =====================================================
-- Tracks automated sync job results
CREATE TABLE IF NOT EXISTS vendor_sync_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id         UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'failed', 'partial'
  items_fetched     INTEGER DEFAULT 0,
  items_created     INTEGER DEFAULT 0,
  items_updated     INTEGER DEFAULT 0,
  items_deactivated INTEGER DEFAULT 0,
  error_message     TEXT,
  metadata          JSONB DEFAULT '{}'::jsonb
);

-- Add indexes
CREATE INDEX idx_vendor_sync_logs_vendor_id ON vendor_sync_logs(vendor_id);
CREATE INDEX idx_vendor_sync_logs_started_at ON vendor_sync_logs(started_at DESC);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE vendors IS 'Costume vendors and their sync configuration';
COMMENT ON TABLE costumes IS 'Global costume catalog from all vendors';
COMMENT ON TABLE costume_sizes IS 'Size variants for each costume';
COMMENT ON TABLE costume_colors IS 'Color variants for each costume';
COMMENT ON TABLE costume_images IS 'Image gallery for each costume';
COMMENT ON TABLE raw_vendor_items IS 'Raw scraping/import data for debugging';
COMMENT ON TABLE performance_costumes IS 'Costumes assigned to recital performances (tenant-scoped)';
COMMENT ON TABLE costume_order_details IS 'Specific size/color orders per performance';
COMMENT ON TABLE vendor_sync_logs IS 'Automated sync job history';

COMMENT ON COLUMN costumes.is_active IS 'False if costume no longer available from vendor';
COMMENT ON COLUMN vendors.is_global IS 'If true, vendor catalog is shared across all studios';
COMMENT ON COLUMN performance_costumes.studio_id IS 'Tenant isolation - which studio owns this assignment';
