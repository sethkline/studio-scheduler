-- Atomic Enrollment Approval Function
-- Handles concurrency-safe enrollment approval with proper locking and transaction safety

CREATE OR REPLACE FUNCTION approve_enrollment_request(
  p_request_id UUID,
  p_approver_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request enrollment_requests%ROWTYPE;
  v_student_id UUID;
  v_class_instance_id UUID;
  v_guardian_id UUID;
  v_max_students INTEGER;
  v_current_enrollments INTEGER;
  v_is_full BOOLEAN;
  v_enrollment_id UUID;
  v_waitlist_position INTEGER;
  v_result jsonb;
BEGIN
  -- Lock the enrollment request row for update (prevents concurrent processing)
  SELECT * INTO v_request
  FROM enrollment_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment request not found';
  END IF;

  -- Verify request is in processable state
  IF v_request.status NOT IN ('pending', 'waitlist') THEN
    RAISE EXCEPTION 'Request status % cannot be processed', v_request.status;
  END IF;

  v_student_id := v_request.student_id;
  v_class_instance_id := v_request.class_instance_id;
  v_guardian_id := v_request.guardian_id;

  -- Get class capacity (with lock to prevent concurrent approvals)
  SELECT cd.max_students INTO v_max_students
  FROM class_instances ci
  JOIN class_definitions cd ON cd.id = ci.class_definition_id
  WHERE ci.id = v_class_instance_id
  FOR UPDATE;

  -- Count current active enrollments (within same transaction, after lock)
  SELECT COUNT(*) INTO v_current_enrollments
  FROM enrollments
  WHERE class_instance_id = v_class_instance_id
    AND status = 'active';

  -- Determine if class is full
  v_is_full := (v_max_students IS NOT NULL AND v_current_enrollments >= v_max_students);

  IF v_is_full THEN
    -- Class is full - calculate waitlist position
    SELECT COALESCE(MAX(waitlist_position), 0) + 1 INTO v_waitlist_position
    FROM enrollment_requests
    WHERE class_instance_id = v_class_instance_id
      AND status = 'waitlist';

    -- Update request to waitlist with position
    UPDATE enrollment_requests
    SET status = 'waitlist',
        waitlist_position = v_waitlist_position,
        processed_at = NOW(),
        processed_by = p_approver_id,
        admin_notes = COALESCE(p_admin_notes, 'Class is full - moved to waitlist')
    WHERE id = p_request_id;

    -- Create notification
    INSERT INTO enrollment_notifications (
      enrollment_request_id,
      guardian_id,
      notification_type,
      subject,
      message,
      metadata
    ) VALUES (
      p_request_id,
      v_guardian_id,
      'waitlist_added',
      'Enrollment Request - Added to Waitlist',
      'Your enrollment request has been approved, but the class is currently full. You have been added to the waitlist.',
      jsonb_build_object(
        'waitlist_position', v_waitlist_position,
        'current_capacity', v_current_enrollments,
        'max_capacity', v_max_students
      )
    );

    v_result := jsonb_build_object(
      'success', true,
      'action', 'waitlisted',
      'waitlist_position', v_waitlist_position,
      'message', 'Class is full. Student added to waitlist at position ' || v_waitlist_position
    );

  ELSE
    -- Class has capacity - create enrollment
    INSERT INTO enrollments (
      student_id,
      class_instance_id,
      status,
      enrolled_at
    ) VALUES (
      v_student_id,
      v_class_instance_id,
      'active',
      NOW()
    )
    RETURNING id INTO v_enrollment_id;

    -- Update request to approved
    UPDATE enrollment_requests
    SET status = 'approved',
        processed_at = NOW(),
        processed_by = p_approver_id,
        admin_notes = p_admin_notes
    WHERE id = p_request_id;

    -- Create notification
    INSERT INTO enrollment_notifications (
      enrollment_request_id,
      guardian_id,
      notification_type,
      subject,
      message,
      metadata
    ) VALUES (
      p_request_id,
      v_guardian_id,
      'approved',
      'Enrollment Request Approved!',
      'Great news! Your enrollment request has been approved and the student is now enrolled.',
      jsonb_build_object(
        'enrollment_id', v_enrollment_id,
        'spots_remaining', v_max_students - v_current_enrollments - 1
      )
    );

    v_result := jsonb_build_object(
      'success', true,
      'action', 'enrolled',
      'enrollment_id', v_enrollment_id,
      'message', 'Student enrolled successfully'
    );
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Enrollment approval failed: %', SQLERRM;
END;
$$;

-- Atomic Enrollment Denial Function
CREATE OR REPLACE FUNCTION deny_enrollment_request(
  p_request_id UUID,
  p_denier_id UUID,
  p_denial_reason TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request enrollment_requests%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Lock the enrollment request row
  SELECT * INTO v_request
  FROM enrollment_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment request not found';
  END IF;

  -- Verify request is in processable state
  IF v_request.status NOT IN ('pending', 'waitlist') THEN
    RAISE EXCEPTION 'Request status % cannot be processed', v_request.status;
  END IF;

  -- Validate denial reason is provided
  IF p_denial_reason IS NULL OR TRIM(p_denial_reason) = '' THEN
    RAISE EXCEPTION 'Denial reason is required';
  END IF;

  -- Update request to denied
  UPDATE enrollment_requests
  SET status = 'denied',
      processed_at = NOW(),
      processed_by = p_denier_id,
      denial_reason = p_denial_reason,
      admin_notes = p_admin_notes
  WHERE id = p_request_id;

  -- Create notification
  INSERT INTO enrollment_notifications (
    enrollment_request_id,
    guardian_id,
    notification_type,
    subject,
    message,
    metadata
  ) VALUES (
    p_request_id,
    v_request.guardian_id,
    'denied',
    'Enrollment Request Denied',
    'Unfortunately, your enrollment request has been denied.',
    jsonb_build_object(
      'denial_reason', p_denial_reason
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'action', 'denied',
    'message', 'Enrollment request denied'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Enrollment denial failed: %', SQLERRM;
END;
$$;

-- Function to promote waitlist when spot opens
CREATE OR REPLACE FUNCTION promote_waitlist_on_drop()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_waitlist enrollment_requests%ROWTYPE;
  v_max_students INTEGER;
  v_current_enrollments INTEGER;
BEGIN
  -- Only process when enrollment is dropped (status changed to 'dropped')
  IF OLD.status = 'active' AND NEW.status = 'dropped' THEN

    -- Get class capacity
    SELECT cd.max_students INTO v_max_students
    FROM class_instances ci
    JOIN class_definitions cd ON cd.id = ci.class_definition_id
    WHERE ci.id = NEW.class_instance_id;

    -- Count current active enrollments
    SELECT COUNT(*) INTO v_current_enrollments
    FROM enrollments
    WHERE class_instance_id = NEW.class_instance_id
      AND status = 'active';

    -- If there's now space and there are waitlisted students
    IF v_max_students IS NOT NULL AND v_current_enrollments < v_max_students THEN

      -- Get next student on waitlist (lowest position)
      SELECT * INTO v_next_waitlist
      FROM enrollment_requests
      WHERE class_instance_id = NEW.class_instance_id
        AND status = 'waitlist'
      ORDER BY waitlist_position ASC NULLS LAST, requested_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

      IF FOUND THEN
        -- Auto-promote to active enrollment
        INSERT INTO enrollments (
          student_id,
          class_instance_id,
          status,
          enrolled_at
        ) VALUES (
          v_next_waitlist.student_id,
          v_next_waitlist.class_instance_id,
          'active',
          NOW()
        );

        -- Update request to approved
        UPDATE enrollment_requests
        SET status = 'approved',
            processed_at = NOW(),
            processed_by = NULL,  -- System action
            admin_notes = 'Auto-promoted from waitlist'
        WHERE id = v_next_waitlist.id;

        -- Create notification
        INSERT INTO enrollment_notifications (
          enrollment_request_id,
          guardian_id,
          notification_type,
          subject,
          message,
          metadata
        ) VALUES (
          v_next_waitlist.id,
          v_next_waitlist.guardian_id,
          'waitlist_promoted',
          'Waitlist Promotion - Spot Available!',
          'Great news! A spot has opened up and your student has been enrolled from the waitlist.',
          jsonb_build_object(
            'auto_promoted', true,
            'previous_position', v_next_waitlist.waitlist_position
          )
        );

        -- Reorder remaining waitlist positions
        UPDATE enrollment_requests
        SET waitlist_position = waitlist_position - 1
        WHERE class_instance_id = NEW.class_instance_id
          AND status = 'waitlist'
          AND waitlist_position > v_next_waitlist.waitlist_position;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for auto-promotion
DROP TRIGGER IF EXISTS trigger_promote_waitlist ON enrollments;
CREATE TRIGGER trigger_promote_waitlist
  AFTER UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION promote_waitlist_on_drop();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_enrollment_request TO authenticated;
GRANT EXECUTE ON FUNCTION deny_enrollment_request TO authenticated;

COMMENT ON FUNCTION approve_enrollment_request IS 'Atomically approves an enrollment request with concurrency-safe capacity checking';
COMMENT ON FUNCTION deny_enrollment_request IS 'Atomically denies an enrollment request';
COMMENT ON FUNCTION promote_waitlist_on_drop IS 'Automatically promotes next waitlist student when a spot opens';
