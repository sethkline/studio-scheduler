-- Migration: Ticketing Helper Functions
-- Created: 2025-11-16
-- Description: Database functions for ticketing operations (seat generation, reservations, unique IDs)

-- ============================================
-- FUNCTION: Generate Show Seats from Venue
-- ============================================
-- Creates show_seats entries for a show based on its venue's seat map
-- Returns the number of seats created

CREATE OR REPLACE FUNCTION generate_show_seats(p_show_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_venue_id UUID;
  v_inserted_count INTEGER;
BEGIN
  -- Get venue for this show
  SELECT venue_id INTO v_venue_id
  FROM recital_shows
  WHERE id = p_show_id;

  -- Ensure venue is set
  IF v_venue_id IS NULL THEN
    RAISE EXCEPTION 'Show does not have a venue assigned';
  END IF;

  -- Insert show_seats based on venue seats
  WITH inserted AS (
    INSERT INTO show_seats (show_id, seat_id, price_in_cents, status)
    SELECT
      p_show_id,
      s.id,
      COALESCE(pz.price_in_cents, 0),
      'available'
    FROM seats s
    LEFT JOIN price_zones pz ON s.price_zone_id = pz.id
    WHERE s.venue_id = v_venue_id
      AND s.is_sellable = true
    ON CONFLICT (show_id, seat_id) DO NOTHING
    RETURNING *
  )
  SELECT COUNT(*)::INTEGER INTO v_inserted_count FROM inserted;

  RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_show_seats IS 'Generates show_seats from venue seat map for a specific show';

-- ============================================
-- FUNCTION: Cleanup Expired Reservations
-- ============================================
-- Releases seats that have expired reservations
-- Should be run periodically (e.g., every minute via cron)
-- Returns the number of seats released

CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE show_seats
  SET
    status = 'available',
    reserved_by = NULL,
    reserved_until = NULL,
    updated_at = NOW()
  WHERE status = 'reserved'
    AND reserved_until < NOW();

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_reservations IS 'Releases seats with expired reservations (run via cron)';

-- ============================================
-- FUNCTION: Generate Unique Order Number
-- ============================================
-- Generates a unique, human-readable order number
-- Format: ORD-YYYYMMDD-XXXXXX (e.g., ORD-20251116-A3F9B2)

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ORD-' ||
    TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_order_number IS 'Generates unique human-readable order number';

-- ============================================
-- FUNCTION: Generate Unique Ticket Number
-- ============================================
-- Generates a unique, human-readable ticket number
-- Format: TKT-YYYYMMDD-XXXXXX (e.g., TKT-20251116-D8E7C1)

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TKT-' ||
    TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_ticket_number IS 'Generates unique human-readable ticket number';

-- ============================================
-- FUNCTION: Generate Unique QR Code
-- ============================================
-- Generates a unique QR code token for ticket validation
-- Format: TKT-XXXXXXXXXXXX (e.g., TKT-A1B2C3D4E5F6)

CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TKT-' ||
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 12));
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_qr_code IS 'Generates unique QR code token for ticket validation';

-- ============================================
-- FUNCTION: Generate Access Code
-- ============================================
-- Generates a unique access code for digital media downloads
-- Format: XXXX-XXXX-XXXX-XXXX (e.g., A1B2-C3D4-E5F6-G7H8)

CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code in format XXXX-XXXX-XXXX-XXXX
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' ||
              UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' ||
              UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' ||
              UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM media_access_codes WHERE access_code = v_code)
    INTO v_exists;

    -- Exit loop if code is unique
    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_access_code IS 'Generates unique access code for digital media downloads';

-- ============================================
-- FUNCTION: Reserve Seats
-- ============================================
-- Reserves multiple seats for a session during checkout
-- Returns true if all seats were successfully reserved, false otherwise

CREATE OR REPLACE FUNCTION reserve_seats(
  p_show_id UUID,
  p_seat_ids UUID[],
  p_session_id TEXT,
  p_duration_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
  v_reserved_until TIMESTAMPTZ;
  v_available_count INTEGER;
BEGIN
  -- Calculate reservation expiration
  v_reserved_until := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;

  -- Check if all seats are available
  SELECT COUNT(*)::INTEGER INTO v_available_count
  FROM show_seats
  WHERE show_id = p_show_id
    AND seat_id = ANY(p_seat_ids)
    AND status = 'available';

  -- If not all seats are available, return false
  IF v_available_count != array_length(p_seat_ids, 1) THEN
    RETURN false;
  END IF;

  -- Reserve the seats
  UPDATE show_seats
  SET
    status = 'reserved',
    reserved_by = p_session_id,
    reserved_until = v_reserved_until,
    updated_at = NOW()
  WHERE show_id = p_show_id
    AND seat_id = ANY(p_seat_ids)
    AND status = 'available';

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reserve_seats IS 'Temporarily reserves seats for a session during checkout process';

-- ============================================
-- FUNCTION: Release Seats
-- ============================================
-- Releases reserved seats for a specific session
-- Returns the number of seats released

CREATE OR REPLACE FUNCTION release_seats(
  p_session_id TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_released_count INTEGER;
BEGIN
  UPDATE show_seats
  SET
    status = 'available',
    reserved_by = NULL,
    reserved_until = NULL,
    updated_at = NOW()
  WHERE reserved_by = p_session_id
    AND status = 'reserved';

  GET DIAGNOSTICS v_released_count = ROW_COUNT;

  RETURN v_released_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION release_seats IS 'Releases seats reserved by a specific session';

-- ============================================
-- FUNCTION: Mark Seats as Sold
-- ============================================
-- Marks reserved seats as sold when payment is confirmed
-- Returns the number of seats marked as sold

CREATE OR REPLACE FUNCTION mark_seats_sold(
  p_session_id TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_sold_count INTEGER;
BEGIN
  UPDATE show_seats
  SET
    status = 'sold',
    reserved_by = NULL,
    reserved_until = NULL,
    updated_at = NOW()
  WHERE reserved_by = p_session_id
    AND status = 'reserved';

  GET DIAGNOSTICS v_sold_count = ROW_COUNT;

  RETURN v_sold_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_seats_sold IS 'Marks reserved seats as sold after payment confirmation';

-- ============================================
-- FUNCTION: Get Seat Availability Stats
-- ============================================
-- Returns seat availability statistics for a show
-- Returns: JSON with total, available, reserved, sold, held counts

CREATE OR REPLACE FUNCTION get_seat_availability_stats(p_show_id UUID)
RETURNS JSON AS $$
DECLARE
  v_stats JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'available', COUNT(*) FILTER (WHERE status = 'available'),
    'reserved', COUNT(*) FILTER (WHERE status = 'reserved'),
    'sold', COUNT(*) FILTER (WHERE status = 'sold'),
    'held', COUNT(*) FILTER (WHERE status = 'held')
  ) INTO v_stats
  FROM show_seats
  WHERE show_id = p_show_id;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_seat_availability_stats IS 'Returns seat availability statistics for a show';
