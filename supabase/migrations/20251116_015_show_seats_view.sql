-- Migration: Create show_seats_with_details view
-- Purpose: Provide a unified view of show_seats with joined seat details
-- This fixes API endpoints that were trying to SELECT non-existent columns from show_seats
-- See: docs/SCHEMA_FIXES_NEEDED.md

-- Create the view that joins show_seats with related tables
CREATE OR REPLACE VIEW show_seats_with_details AS
SELECT
  -- show_seats columns
  ss.id,
  ss.show_id,
  ss.seat_id,
  ss.status,
  ss.price_in_cents,
  ss.reserved_by,
  ss.reserved_until,
  ss.created_at,
  ss.updated_at,

  -- From seats table
  s.row_name,
  s.seat_number,
  s.seat_type,
  s.x_position,
  s.y_position,
  s.section_id,
  s.price_zone_id,
  s.is_sellable,

  -- From venue_sections
  vs.name as section_name,
  vs.display_order as section_order,
  vs.venue_id,

  -- From price_zones
  pz.name as price_zone_name,
  pz.color as price_zone_color,

  -- Derived/computed fields for backwards compatibility
  vs.name as section,  -- Alias for API compatibility
  CASE WHEN s.seat_type = 'ada' THEN true ELSE false END as handicap_access

FROM show_seats ss
INNER JOIN seats s ON ss.seat_id = s.id
LEFT JOIN venue_sections vs ON s.section_id = vs.id
LEFT JOIN price_zones pz ON s.price_zone_id = pz.id;

-- Enable RLS on the view (security_invoker mode)
-- This makes the view use the permissions of the calling user
ALTER VIEW show_seats_with_details SET (security_invoker = on);

-- Add comment for documentation
COMMENT ON VIEW show_seats_with_details IS
  'Denormalized view of show_seats with seat details, sections, and price zones. ' ||
  'Use this view instead of directly selecting from show_seats when you need ' ||
  'seat location details (section, row, seat_number, etc.)';

-- Grant permissions
-- Public can view (filtered by RLS on underlying tables)
GRANT SELECT ON show_seats_with_details TO anon;
GRANT SELECT ON show_seats_with_details TO authenticated;

-- Create index on the underlying table to optimize view queries
-- (These may already exist, but creating if not exists)
DO $$
BEGIN
  -- Index for filtering by show_id
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_show_seats_show_id') THEN
    CREATE INDEX idx_show_seats_show_id ON show_seats(show_id);
  END IF;

  -- Index for filtering by status
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_show_seats_status') THEN
    CREATE INDEX idx_show_seats_status ON show_seats(status);
  END IF;

  -- Index for reservation lookups
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_show_seats_reserved_by') THEN
    CREATE INDEX idx_show_seats_reserved_by ON show_seats(reserved_by) WHERE reserved_by IS NOT NULL;
  END IF;

  -- Composite index for common query pattern
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_show_seats_show_status') THEN
    CREATE INDEX idx_show_seats_show_status ON show_seats(show_id, status);
  END IF;
END $$;
