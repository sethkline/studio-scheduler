-- Migration: Reservation Extension Function
-- Created: 2025-11-19
-- Description: Allows users to extend their reservation by 5 minutes (max 3 times)

-- ============================================
-- EXTEND RESERVATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION extend_reservation_atomic(
  p_reservation_token TEXT,
  p_session_id TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  reservation_id UUID,
  new_expires_at TIMESTAMPTZ,
  extensions_remaining INTEGER,
  error_code TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_reservation RECORD;
  v_new_expires_at TIMESTAMPTZ;
  v_seats_updated INTEGER;
  v_max_extensions CONSTANT INTEGER := 3;
  v_extension_duration CONSTANT INTERVAL := '5 minutes';
BEGIN
  -- Find and validate reservation
  SELECT
    id,
    session_id,
    is_active,
    expires_at,
    extension_count,
    recital_show_id
  INTO v_reservation
  FROM seat_reservations
  WHERE reservation_token = p_reservation_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      NULL::TIMESTAMPTZ,
      0,
      'NOT_FOUND'::TEXT,
      'Reservation not found'::TEXT;
    RETURN;
  END IF;

  -- Validate ownership
  IF v_reservation.session_id != p_session_id THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      NULL::TIMESTAMPTZ,
      0,
      'PERMISSION_DENIED'::TEXT,
      'You do not have permission to extend this reservation'::TEXT;
    RETURN;
  END IF;

  -- Check if reservation is active
  IF NOT v_reservation.is_active THEN
    RETURN QUERY SELECT
      false,
      v_reservation.id,
      NULL::TIMESTAMPTZ,
      0,
      'RESERVATION_INACTIVE'::TEXT,
      'Reservation is no longer active'::TEXT;
    RETURN;
  END IF;

  -- Check if already expired
  IF v_reservation.expires_at < NOW() THEN
    RETURN QUERY SELECT
      false,
      v_reservation.id,
      NULL::TIMESTAMPTZ,
      0,
      'RESERVATION_EXPIRED'::TEXT,
      'Reservation has already expired and cannot be extended'::TEXT;
    RETURN;
  END IF;

  -- Check extension limit
  IF v_reservation.extension_count >= v_max_extensions THEN
    RETURN QUERY SELECT
      false,
      v_reservation.id,
      v_reservation.expires_at,
      0,
      'MAX_EXTENSIONS_REACHED'::TEXT,
      format('Maximum of %s extensions already used', v_max_extensions)::TEXT;
    RETURN;
  END IF;

  BEGIN
    -- Calculate new expiration time
    v_new_expires_at := v_reservation.expires_at + v_extension_duration;

    -- Update reservation
    UPDATE seat_reservations
    SET
      expires_at = v_new_expires_at,
      extension_count = extension_count + 1,
      updated_at = NOW()
    WHERE id = v_reservation.id;

    -- Update all associated seats
    WITH updated AS (
      UPDATE show_seats
      SET
        reserved_until = v_new_expires_at,
        updated_at = NOW()
      WHERE reserved_by = v_reservation.id::TEXT
      AND status = 'reserved'
      RETURNING id
    )
    SELECT COUNT(*) INTO v_seats_updated FROM updated;

    -- Log the extension
    INSERT INTO seat_reservation_audit_log (
      event_type,
      reservation_id,
      session_id,
      show_id,
      seat_count,
      metadata
    ) VALUES (
      'extended',
      v_reservation.id,
      p_session_id,
      v_reservation.recital_show_id,
      v_seats_updated,
      jsonb_build_object(
        'previous_expires_at', v_reservation.expires_at,
        'new_expires_at', v_new_expires_at,
        'extension_number', v_reservation.extension_count + 1,
        'extensions_remaining', v_max_extensions - (v_reservation.extension_count + 1)
      )
    );

    -- Return success
    RETURN QUERY SELECT
      true,
      v_reservation.id,
      v_new_expires_at,
      v_max_extensions - (v_reservation.extension_count + 1),
      NULL::TEXT,
      NULL::TEXT;

  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT
        false,
        v_reservation.id,
        NULL::TIMESTAMPTZ,
        0,
        'INTERNAL_ERROR'::TEXT,
        'Failed to extend reservation'::TEXT;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION extend_reservation_atomic IS
  'Extends a reservation by 5 minutes (max 3 times total)';
