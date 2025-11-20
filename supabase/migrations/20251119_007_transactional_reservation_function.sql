-- Migration: Atomic Seat Reservation Function
-- Created: 2025-11-19
-- Description: Replaces application-level reservation logic with atomic database transaction
--
-- This function provides:
-- 1. True ACID transaction guarantees
-- 2. Database-level race condition protection
-- 3. Automatic audit logging
-- 4. Simplified API layer

-- ============================================
-- ATOMIC RESERVE SEATS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION reserve_seats_atomic(
  p_show_id UUID,
  p_seat_ids UUID[],
  p_session_id TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  reservation_id UUID,
  reservation_token TEXT,
  expires_at TIMESTAMPTZ,
  seat_count INTEGER,
  total_amount_in_cents INTEGER,
  error_code TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_reservation_id UUID;
  v_reservation_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_seat_count INTEGER;
  v_total_amount INTEGER;
  v_updated_count INTEGER;
  v_available_count INTEGER;
  v_now TIMESTAMPTZ;
BEGIN
  -- Validate inputs
  IF p_show_id IS NULL THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      0,
      0,
      'INVALID_INPUT'::TEXT,
      'show_id is required'::TEXT;
    RETURN;
  END IF;

  IF p_seat_ids IS NULL OR array_length(p_seat_ids, 1) IS NULL OR array_length(p_seat_ids, 1) = 0 THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      0,
      0,
      'INVALID_INPUT'::TEXT,
      'seat_ids array is required and must not be empty'::TEXT;
    RETURN;
  END IF;

  IF array_length(p_seat_ids, 1) > 10 THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      0,
      0,
      'TOO_MANY_SEATS'::TEXT,
      'Cannot reserve more than 10 seats at once'::TEXT;
    RETURN;
  END IF;

  -- Check for existing active reservation for this session/show
  IF EXISTS (
    SELECT 1
    FROM seat_reservations
    WHERE session_id = p_session_id
    AND recital_show_id = p_show_id
    AND is_active = true
    AND expires_at > NOW()
  ) THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      0,
      0,
      'DUPLICATE_RESERVATION'::TEXT,
      'You already have an active reservation for this show'::TEXT;
    RETURN;
  END IF;

  -- Start the atomic transaction
  v_now := NOW();
  v_seat_count := array_length(p_seat_ids, 1);
  v_reservation_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := v_now + INTERVAL '10 minutes';

  BEGIN
    -- 1. Verify all seats exist and belong to this show
    SELECT COUNT(*)
    INTO v_available_count
    FROM show_seats
    WHERE id = ANY(p_seat_ids)
    AND show_id = p_show_id;

    IF v_available_count != v_seat_count THEN
      RETURN QUERY SELECT
        false,
        NULL::UUID,
        NULL::TEXT,
        NULL::TIMESTAMPTZ,
        0,
        0,
        'SEATS_NOT_FOUND'::TEXT,
        format('%s of %s requested seats not found or do not belong to this show',
               v_seat_count - v_available_count, v_seat_count)::TEXT;
      RETURN;
    END IF;

    -- 2. Create the reservation record
    INSERT INTO seat_reservations (
      recital_show_id,
      session_id,
      email,
      phone,
      reservation_token,
      expires_at,
      is_active,
      extension_count
    ) VALUES (
      p_show_id,
      p_session_id,
      p_email,
      p_phone,
      v_reservation_token,
      v_expires_at,
      true,
      0
    )
    RETURNING id INTO v_reservation_id;

    -- 3. Atomically update seats with race condition protection
    -- The UNIQUE INDEX will prevent double-booking at database level
    WITH updated AS (
      UPDATE show_seats
      SET
        status = 'reserved',
        reserved_by = v_reservation_id::TEXT,
        reserved_until = v_expires_at,
        updated_at = v_now
      WHERE id = ANY(p_seat_ids)
      AND status = 'available'
      AND (reserved_until IS NULL OR reserved_until <= v_now)
      RETURNING id, price_in_cents
    )
    SELECT COUNT(*), COALESCE(SUM(price_in_cents), 0)
    INTO v_updated_count, v_total_amount
    FROM updated;

    -- 4. Verify ALL seats were successfully reserved
    IF v_updated_count != v_seat_count THEN
      -- Race condition detected - some seats were taken
      -- Transaction will auto-rollback
      RAISE EXCEPTION 'RACE_CONDITION: Only % of % seats were available', v_updated_count, v_seat_count
        USING ERRCODE = 'P0002';
    END IF;

    -- 5. Create reservation-seat relationships
    INSERT INTO reservation_seats (reservation_id, seat_id)
    SELECT v_reservation_id, unnest(p_seat_ids);

    -- 6. Log successful reservation
    INSERT INTO seat_reservation_audit_log (
      event_type,
      reservation_id,
      session_id,
      show_id,
      seat_count,
      seat_ids,
      user_agent,
      ip_address,
      metadata
    ) VALUES (
      'created',
      v_reservation_id,
      p_session_id,
      p_show_id,
      v_seat_count,
      p_seat_ids,
      p_user_agent,
      p_ip_address,
      jsonb_build_object(
        'expires_at', v_expires_at,
        'total_amount_in_cents', v_total_amount
      )
    );

    -- 7. Return success
    RETURN QUERY SELECT
      true,
      v_reservation_id,
      v_reservation_token,
      v_expires_at,
      v_seat_count,
      v_total_amount,
      NULL::TEXT,
      NULL::TEXT;

  EXCEPTION
    WHEN SQLSTATE 'P0002' THEN
      -- Race condition - seats were taken
      -- Log the failed attempt
      INSERT INTO seat_reservation_audit_log (
        event_type,
        reservation_id,
        session_id,
        show_id,
        seat_count,
        seat_ids,
        user_agent,
        ip_address,
        error_message,
        metadata
      ) VALUES (
        'failed',
        v_reservation_id,
        p_session_id,
        p_show_id,
        v_seat_count,
        p_seat_ids,
        p_user_agent,
        p_ip_address,
        'One or more seats were taken by another customer',
        jsonb_build_object(
          'requested_seats', v_seat_count,
          'available_seats', v_updated_count
        )
      );

      RETURN QUERY SELECT
        false,
        NULL::UUID,
        NULL::TEXT,
        NULL::TIMESTAMPTZ,
        0,
        0,
        'SEATS_UNAVAILABLE'::TEXT,
        'One or more selected seats were just taken by another customer. Please select different seats.'::TEXT;
    WHEN unique_violation THEN
      -- Database-level constraint prevented double-booking
      INSERT INTO seat_reservation_audit_log (
        event_type,
        session_id,
        show_id,
        seat_count,
        seat_ids,
        error_message
      ) VALUES (
        'failed',
        p_session_id,
        p_show_id,
        v_seat_count,
        p_seat_ids,
        'Database constraint prevented double-booking'
      );

      RETURN QUERY SELECT
        false,
        NULL::UUID,
        NULL::TEXT,
        NULL::TIMESTAMPTZ,
        0,
        0,
        'SEATS_UNAVAILABLE'::TEXT,
        'One or more selected seats are no longer available.'::TEXT;
    WHEN OTHERS THEN
      -- Unexpected error
      INSERT INTO seat_reservation_audit_log (
        event_type,
        session_id,
        show_id,
        seat_count,
        seat_ids,
        error_message
      ) VALUES (
        'failed',
        p_session_id,
        p_show_id,
        v_seat_count,
        p_seat_ids,
        SQLERRM
      );

      RETURN QUERY SELECT
        false,
        NULL::UUID,
        NULL::TEXT,
        NULL::TIMESTAMPTZ,
        0,
        0,
        'INTERNAL_ERROR'::TEXT,
        'An unexpected error occurred while reserving seats'::TEXT;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reserve_seats_atomic IS
  'Atomically reserves seats with full transaction guarantees and audit logging';

-- ============================================
-- ATOMIC RELEASE SEATS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION release_seats_atomic(
  p_reservation_token TEXT,
  p_session_id TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  reservation_id UUID,
  seats_released INTEGER,
  error_code TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_reservation RECORD;
  v_seats_released INTEGER;
BEGIN
  -- Find and validate reservation
  SELECT id, session_id, is_active, recital_show_id
  INTO v_reservation
  FROM seat_reservations
  WHERE reservation_token = p_reservation_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
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
      0,
      'PERMISSION_DENIED'::TEXT,
      'You do not have permission to release this reservation'::TEXT;
    RETURN;
  END IF;

  IF NOT v_reservation.is_active THEN
    RETURN QUERY SELECT
      false,
      v_reservation.id,
      0,
      'ALREADY_INACTIVE'::TEXT,
      'Reservation is already inactive'::TEXT;
    RETURN;
  END IF;

  BEGIN
    -- Release the seats
    WITH released AS (
      UPDATE show_seats
      SET
        status = 'available',
        reserved_by = NULL,
        reserved_until = NULL,
        updated_at = NOW()
      WHERE reserved_by = v_reservation.id::TEXT
      AND status = 'reserved'
      RETURNING id
    )
    SELECT COUNT(*) INTO v_seats_released FROM released;

    -- Deactivate the reservation
    UPDATE seat_reservations
    SET
      is_active = false,
      updated_at = NOW()
    WHERE id = v_reservation.id;

    -- Log the release
    INSERT INTO seat_reservation_audit_log (
      event_type,
      reservation_id,
      session_id,
      show_id,
      seat_count,
      metadata
    ) VALUES (
      'released',
      v_reservation.id,
      p_session_id,
      v_reservation.recital_show_id,
      v_seats_released,
      jsonb_build_object('released_at', NOW())
    );

    RETURN QUERY SELECT
      true,
      v_reservation.id,
      v_seats_released,
      NULL::TEXT,
      NULL::TEXT;

  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT
        false,
        v_reservation.id,
        0,
        'INTERNAL_ERROR'::TEXT,
        'Failed to release reservation'::TEXT;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION release_seats_atomic IS
  'Atomically releases a reservation and returns seats to available pool';
