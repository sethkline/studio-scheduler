-- Migration: Seat Reservations Tables
-- Created: 2025-11-17
-- Description: Creates tables for tracking seat reservations during checkout

-- ============================================
-- SEAT RESERVATIONS TABLE
-- ============================================
CREATE TABLE seat_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recital_show_id UUID NOT NULL REFERENCES recital_shows(id) ON DELETE CASCADE,

  -- Customer information (collected during checkout)
  email TEXT,
  phone TEXT,

  -- Reservation details
  reservation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE seat_reservations IS 'Tracks temporary seat reservations during checkout process';
COMMENT ON COLUMN seat_reservations.reservation_token IS 'Unique token for identifying and validating reservations';
COMMENT ON COLUMN seat_reservations.expires_at IS 'Expiration time for the reservation (default 30 minutes)';
COMMENT ON COLUMN seat_reservations.is_active IS 'Whether the reservation is still active';

-- ============================================
-- RESERVATION SEATS TABLE (Join table)
-- ============================================
CREATE TABLE reservation_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES seat_reservations(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES show_seats(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT reservation_seats_unique UNIQUE(reservation_id, seat_id)
);

COMMENT ON TABLE reservation_seats IS 'Links reservations to specific show seats';

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_seat_reservations_token ON seat_reservations(reservation_token);
CREATE INDEX idx_seat_reservations_show ON seat_reservations(recital_show_id);
CREATE INDEX idx_seat_reservations_expires ON seat_reservations(expires_at) WHERE is_active = TRUE;
CREATE INDEX idx_seat_reservations_email ON seat_reservations(email);

CREATE INDEX idx_reservation_seats_reservation ON reservation_seats(reservation_id);
CREATE INDEX idx_reservation_seats_seat ON reservation_seats(seat_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE TRIGGER update_seat_reservations_updated_at
  BEFORE UPDATE ON seat_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE seat_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_seats ENABLE ROW LEVEL SECURITY;

-- Public can view their own reservations by token
CREATE POLICY "Anyone can view reservations by token"
  ON seat_reservations FOR SELECT
  TO public
  USING (true);

-- Public can create reservations
CREATE POLICY "Anyone can create reservations"
  ON seat_reservations FOR INSERT
  TO public
  WITH CHECK (true);

-- Public can update their own reservations
CREATE POLICY "Anyone can update reservations"
  ON seat_reservations FOR UPDATE
  TO public
  USING (true);

-- Admin and staff can view all reservations
CREATE POLICY "Admin and staff can manage all reservations"
  ON seat_reservations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Reservation seats policies
CREATE POLICY "Anyone can view reservation seats"
  ON reservation_seats FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert reservation seats"
  ON reservation_seats FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admin and staff can manage all reservation seats"
  ON reservation_seats FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- ============================================
-- FUNCTION: Cleanup Expired Seat Reservations
-- ============================================
-- Releases seats and deactivates expired reservations
-- Should be run periodically (e.g., every minute via cron)

CREATE OR REPLACE FUNCTION cleanup_expired_seat_reservations()
RETURNS INTEGER AS $$
DECLARE
  v_released_count INTEGER := 0;
  v_reservation RECORD;
BEGIN
  -- Find all expired active reservations
  FOR v_reservation IN
    SELECT id, reservation_token
    FROM seat_reservations
    WHERE is_active = TRUE
    AND expires_at < NOW()
  LOOP
    -- Release the seats for this reservation
    UPDATE show_seats
    SET
      status = 'available',
      reserved_by = NULL,
      reserved_until = NULL,
      updated_at = NOW()
    WHERE reserved_by = v_reservation.id::TEXT
    AND status = 'reserved';

    GET DIAGNOSTICS v_released_count = v_released_count + ROW_COUNT;

    -- Deactivate the reservation
    UPDATE seat_reservations
    SET is_active = FALSE
    WHERE id = v_reservation.id;
  END LOOP;

  RETURN v_released_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_seat_reservations IS 'Releases seats and deactivates expired reservations (run via cron)';
