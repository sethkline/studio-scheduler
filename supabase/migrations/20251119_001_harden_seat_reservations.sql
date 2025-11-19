-- Migration: Harden Seat Reservation System
-- Created: 2025-11-19
-- Description: Production-ready hardening for ticketing system (Issue #7)
--
-- CHANGES:
-- 1. Add database-level constraint to prevent double-booking
-- 2. Add reservation audit log table for monitoring
-- 3. Improve cleanup function with structured logging
-- 4. Add idempotency support to orders
-- 5. Add reservation extension tracking

-- ============================================
-- 1. DATABASE CONSTRAINT: Prevent Double-Booking
-- ============================================

-- Add unique partial index to GUARANTEE no double-booking at database level
-- This ensures that for any given show, a seat can only have ONE active reservation or sale
CREATE UNIQUE INDEX IF NOT EXISTS idx_show_seats_no_double_booking
  ON show_seats(show_id, seat_id)
  WHERE status IN ('reserved', 'sold');

COMMENT ON INDEX idx_show_seats_no_double_booking IS
  'CRITICAL: Prevents double-booking by ensuring only one active reservation/sale per seat';

-- Add check constraint to ensure reserved_by is set when status is reserved
ALTER TABLE show_seats
  ADD CONSTRAINT chk_reserved_by_required
  CHECK (
    (status = 'reserved' AND reserved_by IS NOT NULL) OR
    (status != 'reserved')
  );

-- ============================================
-- 2. RESERVATION AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS seat_reservation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event details
  event_type TEXT NOT NULL
    CHECK (event_type IN ('created', 'extended', 'released', 'expired', 'completed', 'failed')),

  -- Reservation context
  reservation_id UUID REFERENCES seat_reservations(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  show_id UUID REFERENCES recital_shows(id),

  -- Seat details
  seat_count INTEGER,
  seat_ids UUID[],

  -- Metadata
  user_agent TEXT,
  ip_address INET,
  error_message TEXT, -- For failed events
  metadata JSONB DEFAULT '{}', -- Flexible data for future use

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reservation_audit_event ON seat_reservation_audit_log(event_type, created_at DESC);
CREATE INDEX idx_reservation_audit_reservation ON seat_reservation_audit_log(reservation_id);
CREATE INDEX idx_reservation_audit_session ON seat_reservation_audit_log(session_id);
CREATE INDEX idx_reservation_audit_show ON seat_reservation_audit_log(show_id);

COMMENT ON TABLE seat_reservation_audit_log IS
  'Audit trail for all reservation events - critical for monitoring and debugging';

-- ============================================
-- 3. IMPROVED CLEANUP FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_seat_reservations()
RETURNS TABLE(
  total_reservations_expired INTEGER,
  total_seats_released INTEGER,
  reservation_ids UUID[]
) AS $$
DECLARE
  v_reservations_expired INTEGER := 0;
  v_seats_released INTEGER := 0;
  v_reservation_ids UUID[] := ARRAY[]::UUID[];
  v_reservation RECORD;
  v_seat_count INTEGER;
BEGIN
  -- Find all expired active reservations
  FOR v_reservation IN
    SELECT id, reservation_token, recital_show_id, session_id
    FROM seat_reservations
    WHERE is_active = TRUE
    AND expires_at < NOW()
    ORDER BY expires_at ASC
  LOOP
    -- Count seats before releasing
    SELECT COUNT(*)
    INTO v_seat_count
    FROM show_seats
    WHERE reserved_by = v_reservation.id::TEXT
    AND status = 'reserved';

    -- Release the seats for this reservation
    UPDATE show_seats
    SET
      status = 'available',
      reserved_by = NULL,
      reserved_until = NULL,
      updated_at = NOW()
    WHERE reserved_by = v_reservation.id::TEXT
    AND status = 'reserved';

    v_seats_released := v_seats_released + v_seat_count;

    -- Deactivate the reservation
    UPDATE seat_reservations
    SET
      is_active = FALSE,
      updated_at = NOW()
    WHERE id = v_reservation.id;

    -- Log the expiration event
    INSERT INTO seat_reservation_audit_log (
      event_type,
      reservation_id,
      session_id,
      show_id,
      seat_count,
      metadata
    ) VALUES (
      'expired',
      v_reservation.id,
      v_reservation.session_id,
      v_reservation.recital_show_id,
      v_seat_count,
      jsonb_build_object(
        'reservation_token', v_reservation.reservation_token,
        'expired_at', NOW()
      )
    );

    v_reservations_expired := v_reservations_expired + 1;
    v_reservation_ids := array_append(v_reservation_ids, v_reservation.id);
  END LOOP;

  -- Return summary statistics
  RETURN QUERY SELECT
    v_reservations_expired,
    v_seats_released,
    v_reservation_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_seat_reservations IS
  'Releases seats from expired reservations and logs to audit table. Returns statistics.';

-- ============================================
-- 4. IDEMPOTENCY SUPPORT
-- ============================================

-- Add idempotency_key to ticket_orders for payment deduplication
ALTER TABLE ticket_orders
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_ticket_orders_idempotency
  ON ticket_orders(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN ticket_orders.idempotency_key IS
  'Optional client-provided key to prevent duplicate payment processing';

-- ============================================
-- 5. RESERVATION EXTENSION TRACKING
-- ============================================

-- Track how many times a reservation has been extended
ALTER TABLE seat_reservations
  ADD COLUMN IF NOT EXISTS extension_count INTEGER DEFAULT 0;

ALTER TABLE seat_reservations
  ADD CONSTRAINT chk_extension_count_non_negative
  CHECK (extension_count >= 0);

COMMENT ON COLUMN seat_reservations.extension_count IS
  'Number of times this reservation has been extended (max 3)';

-- ============================================
-- 6. ADD HELPER FUNCTION: Get Reservation Stats
-- ============================================

CREATE OR REPLACE FUNCTION get_reservation_statistics(
  p_show_id UUID DEFAULT NULL,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
  total_created INTEGER,
  total_completed INTEGER,
  total_expired INTEGER,
  total_released INTEGER,
  total_failed INTEGER,
  avg_hold_time_seconds NUMERIC,
  expiration_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      event_type,
      COUNT(*) as event_count,
      AVG(EXTRACT(EPOCH FROM (created_at - lag(created_at) OVER (PARTITION BY reservation_id ORDER BY created_at)))) as avg_duration
    FROM seat_reservation_audit_log
    WHERE
      created_at > NOW() - (p_hours || ' hours')::INTERVAL
      AND (p_show_id IS NULL OR show_id = p_show_id)
    GROUP BY event_type
  )
  SELECT
    COALESCE((SELECT event_count FROM stats WHERE event_type = 'created'), 0)::INTEGER,
    COALESCE((SELECT event_count FROM stats WHERE event_type = 'completed'), 0)::INTEGER,
    COALESCE((SELECT event_count FROM stats WHERE event_type = 'expired'), 0)::INTEGER,
    COALESCE((SELECT event_count FROM stats WHERE event_type = 'released'), 0)::INTEGER,
    COALESCE((SELECT event_count FROM stats WHERE event_type = 'failed'), 0)::INTEGER,
    COALESCE((SELECT AVG(avg_duration) FROM stats), 0)::NUMERIC,
    CASE
      WHEN COALESCE((SELECT event_count FROM stats WHERE event_type = 'created'), 0) > 0
      THEN COALESCE((SELECT event_count FROM stats WHERE event_type = 'expired'), 0)::NUMERIC /
           COALESCE((SELECT event_count FROM stats WHERE event_type = 'created'), 1)::NUMERIC
      ELSE 0
    END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_reservation_statistics IS
  'Get reservation metrics for monitoring dashboard (default: last 24 hours)';

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE seat_reservation_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin and staff can view all audit logs
CREATE POLICY "Admin and staff can view audit logs"
  ON seat_reservation_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- System can insert audit logs (service role)
CREATE POLICY "System can insert audit logs"
  ON seat_reservation_audit_log FOR INSERT
  TO public
  WITH CHECK (true);
