-- Migration: Ticketing Venues & Seating Infrastructure
-- Created: 2025-11-16
-- Description: Creates core tables for venue management and seat mapping

-- ============================================
-- VENUES TABLE
-- ============================================
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  capacity INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE venues IS 'Performance venues where recital shows are held';
COMMENT ON COLUMN venues.capacity IS 'Total venue capacity (informational, calculated from seats)';

-- ============================================
-- VENUE SECTIONS TABLE
-- ============================================
CREATE TABLE venue_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE venue_sections IS 'Logical sections within a venue (e.g., Orchestra, Balcony, Mezzanine)';
COMMENT ON COLUMN venue_sections.display_order IS 'Order in which sections should be displayed in UI';

-- ============================================
-- PRICE ZONES TABLE
-- ============================================
CREATE TABLE price_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_in_cents INTEGER NOT NULL,
  color TEXT, -- hex color for visual display (e.g., '#FF5733')
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT price_zones_price_positive CHECK (price_in_cents >= 0)
);

COMMENT ON TABLE price_zones IS 'Pricing tiers for different seating areas within a venue';
COMMENT ON COLUMN price_zones.color IS 'Hex color code for visual representation in seat map editor';

-- ============================================
-- SEATS TABLE
-- ============================================
CREATE TABLE seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES venue_sections(id) ON DELETE CASCADE,
  row_name TEXT NOT NULL,
  seat_number TEXT NOT NULL,
  seat_type TEXT NOT NULL DEFAULT 'regular'
    CHECK (seat_type IN ('regular', 'ada', 'house', 'blocked')),
  price_zone_id UUID REFERENCES price_zones(id),
  is_sellable BOOLEAN DEFAULT true,
  x_position INTEGER, -- for visual editor positioning
  y_position INTEGER, -- for visual editor positioning
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT seats_unique_per_venue UNIQUE(venue_id, section_id, row_name, seat_number)
);

COMMENT ON TABLE seats IS 'Individual seats within a venue (template for show_seats)';
COMMENT ON COLUMN seats.seat_type IS 'Type of seat: regular, ada (wheelchair accessible), house (comped), blocked (not for sale)';
COMMENT ON COLUMN seats.is_sellable IS 'Whether this seat can be sold to customers';
COMMENT ON COLUMN seats.x_position IS 'X coordinate for visual seat map editor';
COMMENT ON COLUMN seats.y_position IS 'Y coordinate for visual seat map editor';

-- ============================================
-- INDEXES
-- ============================================

-- Seats indexes for performance
CREATE INDEX idx_seats_venue ON seats(venue_id);
CREATE INDEX idx_seats_section ON seats(section_id);
CREATE INDEX idx_seats_price_zone ON seats(price_zone_id);
CREATE INDEX idx_seats_sellable ON seats(is_sellable) WHERE is_sellable = true;

-- Venue sections index
CREATE INDEX idx_venue_sections_venue ON venue_sections(venue_id);
CREATE INDEX idx_venue_sections_order ON venue_sections(venue_id, display_order);

-- Price zones index
CREATE INDEX idx_price_zones_venue ON price_zones(venue_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables
CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_sections_updated_at
  BEFORE UPDATE ON venue_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_zones_updated_at
  BEFORE UPDATE ON price_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seats_updated_at
  BEFORE UPDATE ON seats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;

-- Venues policies
CREATE POLICY "Public can view venues"
  ON venues FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin and staff can manage venues"
  ON venues FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Venue sections policies
CREATE POLICY "Public can view venue sections"
  ON venue_sections FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin and staff can manage venue sections"
  ON venue_sections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Price zones policies
CREATE POLICY "Public can view price zones"
  ON price_zones FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin and staff can manage price zones"
  ON price_zones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Seats policies
CREATE POLICY "Public can view seats"
  ON seats FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin and staff can manage seats"
  ON seats FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );
