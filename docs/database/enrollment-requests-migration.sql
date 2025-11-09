-- Migration: Parent Class Enrollment Request System
-- Description: Adds approval workflow for parent-initiated class enrollments
-- Date: 2025-11-06

-- ============================================================================
-- ENROLLMENT REQUESTS TABLE
-- ============================================================================
-- Stores parent requests to enroll students in classes
-- Requires admin/staff approval before converting to active enrollment

CREATE TABLE IF NOT EXISTS enrollment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_instance_id UUID NOT NULL REFERENCES class_instances(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,

    -- Request status workflow
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'denied', 'cancelled', 'waitlist')),

    -- Timestamps for workflow tracking
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP,
    processed_by UUID REFERENCES profiles(id), -- Staff/admin who processed

    -- Additional information
    notes TEXT, -- Parent notes during request
    admin_notes TEXT, -- Staff notes during processing
    denial_reason TEXT, -- Reason if denied

    -- Conflict warnings (populated at request time)
    has_schedule_conflict BOOLEAN DEFAULT false,
    conflict_details JSONB, -- Details of detected conflicts

    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Prevent duplicate pending requests
    UNIQUE (student_id, class_instance_id, status)
        WHERE status IN ('pending', 'approved', 'waitlist')
);

-- Indexes for performance
CREATE INDEX idx_enrollment_requests_student ON enrollment_requests(student_id);
CREATE INDEX idx_enrollment_requests_class ON enrollment_requests(class_instance_id);
CREATE INDEX idx_enrollment_requests_guardian ON enrollment_requests(guardian_id);
CREATE INDEX idx_enrollment_requests_status ON enrollment_requests(status);
CREATE INDEX idx_enrollment_requests_requested_at ON enrollment_requests(requested_at DESC);

-- ============================================================================
-- ENROLLMENT HISTORY TABLE
-- ============================================================================
-- Tracks all enrollment state changes for audit trail

CREATE TABLE IF NOT EXISTS enrollment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
    enrollment_request_id UUID REFERENCES enrollment_requests(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_instance_id UUID NOT NULL REFERENCES class_instances(id) ON DELETE CASCADE,

    -- State change tracking
    action VARCHAR(50) NOT NULL
        CHECK (action IN ('requested', 'approved', 'denied', 'enrolled', 'dropped', 'waitlist_added', 'waitlist_promoted', 'cancelled')),
    previous_status VARCHAR(20),
    new_status VARCHAR(20),

    -- Who performed the action
    performed_by UUID REFERENCES profiles(id),
    performed_by_role VARCHAR(20), -- 'parent', 'staff', 'admin', 'system'

    -- Additional context
    notes TEXT,
    metadata JSONB, -- Flexible field for action-specific data

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_enrollment_history_enrollment ON enrollment_history(enrollment_id);
CREATE INDEX idx_enrollment_history_request ON enrollment_history(enrollment_request_id);
CREATE INDEX idx_enrollment_history_student ON enrollment_history(student_id);
CREATE INDEX idx_enrollment_history_class ON enrollment_history(class_instance_id);
CREATE INDEX idx_enrollment_history_created ON enrollment_history(created_at DESC);

-- ============================================================================
-- NOTIFICATION QUEUE TABLE
-- ============================================================================
-- Queues notifications to be sent to parents about enrollment status

CREATE TABLE IF NOT EXISTS enrollment_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_request_id UUID REFERENCES enrollment_requests(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,

    -- Notification details
    notification_type VARCHAR(50) NOT NULL
        CHECK (notification_type IN ('request_received', 'approved', 'denied', 'waitlist_added', 'waitlist_promoted', 'class_full', 'schedule_conflict')),

    -- Delivery status
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),

    -- Notification content
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB, -- Class details, student name, etc.

    -- Delivery tracking
    sent_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_enrollment_notifications_request ON enrollment_notifications(enrollment_request_id);
CREATE INDEX idx_enrollment_notifications_guardian ON enrollment_notifications(guardian_id);
CREATE INDEX idx_enrollment_notifications_status ON enrollment_notifications(status);
CREATE INDEX idx_enrollment_notifications_created ON enrollment_notifications(created_at DESC);

-- ============================================================================
-- UPDATED TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on enrollment_requests
CREATE OR REPLACE FUNCTION update_enrollment_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enrollment_requests_updated_at
    BEFORE UPDATE ON enrollment_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_enrollment_requests_updated_at();

-- Update updated_at timestamp on enrollment_notifications
CREATE OR REPLACE FUNCTION update_enrollment_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enrollment_notifications_updated_at
    BEFORE UPDATE ON enrollment_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_enrollment_notifications_updated_at();

-- Auto-create enrollment history entry when enrollment_request status changes
CREATE OR REPLACE FUNCTION create_enrollment_history_on_request_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create history entry if status changed
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) OR TG_OP = 'INSERT' THEN
        INSERT INTO enrollment_history (
            enrollment_request_id,
            student_id,
            class_instance_id,
            action,
            previous_status,
            new_status,
            performed_by,
            performed_by_role,
            notes,
            metadata
        ) VALUES (
            NEW.id,
            NEW.student_id,
            NEW.class_instance_id,
            CASE NEW.status
                WHEN 'pending' THEN 'requested'
                WHEN 'approved' THEN 'approved'
                WHEN 'denied' THEN 'denied'
                WHEN 'waitlist' THEN 'waitlist_added'
                WHEN 'cancelled' THEN 'cancelled'
            END,
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
            NEW.status,
            NEW.processed_by,
            CASE
                WHEN NEW.processed_by IS NULL THEN 'parent'
                ELSE 'staff' -- Could be enhanced with role lookup
            END,
            NEW.admin_notes,
            jsonb_build_object(
                'has_schedule_conflict', NEW.has_schedule_conflict,
                'conflict_details', NEW.conflict_details
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enrollment_request_history_trigger
    AFTER INSERT OR UPDATE ON enrollment_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_enrollment_history_on_request_change();

-- Auto-create enrollment history entry when enrollment status changes
CREATE OR REPLACE FUNCTION create_enrollment_history_on_enrollment_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) OR TG_OP = 'INSERT' THEN
        INSERT INTO enrollment_history (
            enrollment_id,
            student_id,
            class_instance_id,
            action,
            previous_status,
            new_status,
            performed_by_role,
            metadata
        ) VALUES (
            NEW.id,
            NEW.student_id,
            NEW.class_instance_id,
            CASE NEW.status
                WHEN 'active' THEN 'enrolled'
                WHEN 'dropped' THEN 'dropped'
                WHEN 'waitlist' THEN 'waitlist_added'
            END,
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
            NEW.status,
            'system',
            jsonb_build_object(
                'enrolled_at', NEW.enrolled_at,
                'dropped_at', NEW.dropped_at
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enrollment_history_trigger
    AFTER INSERT OR UPDATE ON enrollments
    FOR EACH ROW
    EXECUTE FUNCTION create_enrollment_history_on_enrollment_change();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE enrollment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_notifications ENABLE ROW LEVEL SECURITY;

-- Enrollment Requests Policies

-- Parents can view their own requests
CREATE POLICY enrollment_requests_parent_select ON enrollment_requests
    FOR SELECT
    TO authenticated
    USING (
        guardian_id IN (
            SELECT id FROM guardians WHERE user_id = auth.uid()
        )
    );

-- Parents can create requests for their students
CREATE POLICY enrollment_requests_parent_insert ON enrollment_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (
        guardian_id IN (
            SELECT id FROM guardians WHERE user_id = auth.uid()
        )
        AND student_id IN (
            SELECT student_id FROM student_guardian_relationships
            WHERE guardian_id IN (
                SELECT id FROM guardians WHERE user_id = auth.uid()
            )
        )
    );

-- Parents can cancel their pending requests
CREATE POLICY enrollment_requests_parent_update ON enrollment_requests
    FOR UPDATE
    TO authenticated
    USING (
        guardian_id IN (
            SELECT id FROM guardians WHERE user_id = auth.uid()
        )
        AND status = 'pending'
    )
    WITH CHECK (
        status = 'cancelled'
    );

-- Staff and admins can view all requests
CREATE POLICY enrollment_requests_staff_select ON enrollment_requests
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND user_role IN ('admin', 'staff')
        )
    );

-- Staff and admins can update requests (approve/deny)
CREATE POLICY enrollment_requests_staff_update ON enrollment_requests
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND user_role IN ('admin', 'staff')
        )
    );

-- Enrollment History Policies

-- Parents can view history for their students
CREATE POLICY enrollment_history_parent_select ON enrollment_history
    FOR SELECT
    TO authenticated
    USING (
        student_id IN (
            SELECT student_id FROM student_guardian_relationships sgr
            JOIN guardians g ON g.id = sgr.guardian_id
            WHERE g.user_id = auth.uid()
        )
    );

-- Staff and admins can view all history
CREATE POLICY enrollment_history_staff_select ON enrollment_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND user_role IN ('admin', 'staff')
        )
    );

-- System can insert history (handled by triggers)
CREATE POLICY enrollment_history_system_insert ON enrollment_history
    FOR INSERT
    TO authenticated
    WITH CHECK (true); -- Triggers run as system user

-- Notification Policies

-- Parents can view their own notifications
CREATE POLICY enrollment_notifications_parent_select ON enrollment_notifications
    FOR SELECT
    TO authenticated
    USING (
        guardian_id IN (
            SELECT id FROM guardians WHERE user_id = auth.uid()
        )
    );

-- Staff can view all notifications
CREATE POLICY enrollment_notifications_staff_select ON enrollment_notifications
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND user_role IN ('admin', 'staff')
        )
    );

-- System can insert/update notifications
CREATE POLICY enrollment_notifications_system_all ON enrollment_notifications
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get enrollment request details with all related data
CREATE OR REPLACE FUNCTION get_enrollment_request_details(request_id UUID)
RETURNS TABLE (
    id UUID,
    student_id UUID,
    student_name TEXT,
    class_instance_id UUID,
    class_name TEXT,
    dance_style TEXT,
    class_level TEXT,
    teacher_name TEXT,
    schedule_info JSONB,
    guardian_id UUID,
    guardian_name TEXT,
    status VARCHAR,
    requested_at TIMESTAMP,
    processed_at TIMESTAMP,
    has_schedule_conflict BOOLEAN,
    conflict_details JSONB,
    notes TEXT,
    admin_notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        er.id,
        er.student_id,
        s.first_name || ' ' || s.last_name as student_name,
        er.class_instance_id,
        cd.name as class_name,
        ds.name as dance_style,
        cl.name as class_level,
        t.first_name || ' ' || t.last_name as teacher_name,
        jsonb_agg(
            jsonb_build_object(
                'day_of_week', sc.day_of_week,
                'start_time', sc.start_time,
                'end_time', sc.end_time
            )
        ) as schedule_info,
        er.guardian_id,
        g.first_name || ' ' || g.last_name as guardian_name,
        er.status,
        er.requested_at,
        er.processed_at,
        er.has_schedule_conflict,
        er.conflict_details,
        er.notes,
        er.admin_notes
    FROM enrollment_requests er
    JOIN students s ON s.id = er.student_id
    JOIN guardians g ON g.id = er.guardian_id
    JOIN class_instances ci ON ci.id = er.class_instance_id
    JOIN class_definitions cd ON cd.id = ci.class_definition_id
    LEFT JOIN dance_styles ds ON ds.id = cd.dance_style_id
    LEFT JOIN class_levels cl ON cl.id = cd.class_level_id
    LEFT JOIN teachers t ON t.id = ci.teacher_id
    LEFT JOIN schedule_classes sc ON sc.class_instance_id = ci.id
    WHERE er.id = request_id
    GROUP BY
        er.id, s.first_name, s.last_name, cd.name, ds.name, cl.name,
        t.first_name, t.last_name, g.first_name, g.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Comment out if not needed
/*
-- Add sample enrollment request statuses to existing enrollments table enum
-- (This would be an ALTER TYPE command if modifying existing enum)

-- Example enrollment request
INSERT INTO enrollment_requests (
    student_id,
    class_instance_id,
    guardian_id,
    status,
    notes,
    has_schedule_conflict
) VALUES (
    (SELECT id FROM students LIMIT 1),
    (SELECT id FROM class_instances LIMIT 1),
    (SELECT id FROM guardians LIMIT 1),
    'pending',
    'My daughter is very excited to start ballet!',
    false
);
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON enrollment_requests TO authenticated;
GRANT SELECT ON enrollment_history TO authenticated;
GRANT SELECT ON enrollment_notifications TO authenticated;

-- Grant permissions to service role (for background jobs)
GRANT ALL ON enrollment_requests TO service_role;
GRANT ALL ON enrollment_history TO service_role;
GRANT ALL ON enrollment_notifications TO service_role;

COMMENT ON TABLE enrollment_requests IS 'Parent-initiated requests to enroll students in classes, requiring admin approval';
COMMENT ON TABLE enrollment_history IS 'Complete audit trail of all enrollment-related actions and state changes';
COMMENT ON TABLE enrollment_notifications IS 'Queue for enrollment-related notifications to be sent to parents';
