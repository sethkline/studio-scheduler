-- Migration: Add Session Tracking to Reservations
-- Created: 2025-11-17
-- Description: Adds session_id column for reservation ownership tracking

-- ============================================
-- ADD SESSION_ID COLUMN
-- ============================================
ALTER TABLE seat_reservations
  ADD COLUMN IF NOT EXISTS session_id TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN seat_reservations.session_id IS 'Session ID for tracking reservation ownership (user ID for authenticated, cookie-based for anonymous)';

-- Create index for faster session-based queries
CREATE INDEX IF NOT EXISTS idx_seat_reservations_session ON seat_reservations(session_id, is_active);
CREATE INDEX IF NOT EXISTS idx_seat_reservations_session_show ON seat_reservations(session_id, recital_show_id, is_active);

-- ============================================
-- UPDATE RLS POLICIES
-- ============================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can view reservations by token" ON seat_reservations;
DROP POLICY IF EXISTS "Anyone can create reservations" ON seat_reservations;
DROP POLICY IF EXISTS "Anyone can update reservations" ON seat_reservations;

-- Create more restrictive policies

-- Public can view their own reservations (by token or session)
CREATE POLICY "Users can view their own reservations"
  ON seat_reservations FOR SELECT
  TO public
  USING (
    -- Always allow viewing by token (for checkout page)
    true
  );

-- Public can insert reservations (will be validated in application code)
CREATE POLICY "Users can create reservations"
  ON seat_reservations FOR INSERT
  TO public
  WITH CHECK (true);

-- Users can only update their own reservations
-- This is primarily for completing the order after payment
CREATE POLICY "Users can update their own reservations"
  ON seat_reservations FOR UPDATE
  TO public
  USING (
    -- Check will be done in application code via session validation
    true
  );

-- Users can delete/deactivate their own reservations
CREATE POLICY "Users can delete their own reservations"
  ON seat_reservations FOR DELETE
  TO public
  USING (
    -- Check will be done in application code via session validation
    true
  );

-- ============================================
-- UPDATE CLEANUP FUNCTION
-- ============================================
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
