-- ============================================================================
-- Unified Inbox Row-Level Security (RLS) Policies
-- ============================================================================
-- This migration adds RLS policies to ensure proper data isolation and
-- access control for the unified inbox feature.
--
-- Security Model:
-- - Studio isolation: Users can only access messages from their studio
-- - Role-based access: Different permissions based on user role
-- - Message visibility: Users see messages they sent, received, or are assigned to
-- - Admin/Staff: Full access to all studio messages
-- - Teachers/Parents: Limited to their own communications
--
-- Author: Claude
-- Date: 2025-11-21
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_email_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- MESSAGE_THREADS POLICIES
-- ============================================================================

-- Allow users to view threads they participate in or are assigned to
CREATE POLICY "Users can view their message threads"
  ON message_threads
  FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      -- User is a participant
      auth.uid()::TEXT = ANY(participants)
      -- User is assigned
      OR assigned_to = auth.uid()
      -- Admin or Staff can see all
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND user_role IN ('admin', 'staff')
          AND studio_id = message_threads.studio_id
      )
    )
  );

-- Staff and admins can create threads
CREATE POLICY "Staff can create message threads"
  ON message_threads
  FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM profiles
      WHERE id = auth.uid()
        AND user_role IN ('admin', 'staff', 'teacher')
    )
  );

-- Users can update threads they're assigned to or admin/staff
CREATE POLICY "Users can update assigned threads"
  ON message_threads
  FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      assigned_to = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND user_role IN ('admin', 'staff')
          AND studio_id = message_threads.studio_id
      )
    )
  );

-- Only admin/staff can delete threads
CREATE POLICY "Admin and staff can delete threads"
  ON message_threads
  FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM profiles
      WHERE id = auth.uid()
        AND user_role IN ('admin', 'staff')
    )
  );

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

-- Users can view messages they sent, received, or are assigned to
CREATE POLICY "Users can view their messages"
  ON messages
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      -- User sent the message
      auth.uid()::TEXT = from_address
      -- User is in to_addresses
      OR auth.uid()::TEXT = ANY(to_addresses)
      -- User is in cc_addresses
      OR auth.uid()::TEXT = ANY(cc_addresses)
      -- User is assigned
      OR assigned_to = auth.uid()
      -- Admin or Staff can see all studio messages
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND user_role IN ('admin', 'staff')
          AND studio_id = messages.studio_id
      )
      -- User can see messages in threads they participate in
      OR EXISTS (
        SELECT 1 FROM message_threads
        WHERE id = messages.thread_id
          AND auth.uid()::TEXT = ANY(participants)
      )
    )
  );

-- Authenticated users can create messages (will be filtered by role in app logic)
CREATE POLICY "Authenticated users can create messages"
  ON messages
  FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      -- User must be the sender
      from_address = auth.uid()::TEXT
      -- Or admin/staff (for system messages)
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND user_role IN ('admin', 'staff')
          AND studio_id = messages.studio_id
      )
    )
  );

-- Users can update messages they sent or are assigned to
CREATE POLICY "Users can update their messages"
  ON messages
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      -- User sent the message
      from_address = auth.uid()::TEXT
      -- User is assigned
      OR assigned_to = auth.uid()
      -- Admin or Staff
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND user_role IN ('admin', 'staff')
          AND studio_id = messages.studio_id
      )
    )
  );

-- Users can soft-delete their own messages, admin/staff can delete any
CREATE POLICY "Users can delete their messages"
  ON messages
  FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      from_address = auth.uid()::TEXT
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND user_role IN ('admin', 'staff')
          AND studio_id = messages.studio_id
      )
    )
  );

-- ============================================================================
-- MESSAGE_ATTACHMENTS POLICIES
-- ============================================================================

-- Users can view attachments for messages they can see
CREATE POLICY "Users can view message attachments"
  ON message_attachments
  FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM messages
      WHERE id = message_attachments.message_id
        AND (
          auth.uid()::TEXT = from_address
          OR auth.uid()::TEXT = ANY(to_addresses)
          OR auth.uid()::TEXT = ANY(cc_addresses)
          OR assigned_to = auth.uid()
          OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND user_role IN ('admin', 'staff')
              AND studio_id = messages.studio_id
          )
        )
    )
  );

-- Users can add attachments to messages they create
CREATE POLICY "Users can create attachments for their messages"
  ON message_attachments
  FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM messages
      WHERE id = message_attachments.message_id
        AND from_address = auth.uid()::TEXT
    )
  );

-- Users can update attachment metadata for messages they own
CREATE POLICY "Users can update their message attachments"
  ON message_attachments
  FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM messages
      WHERE id = message_attachments.message_id
        AND (
          from_address = auth.uid()::TEXT
          OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND user_role IN ('admin', 'staff')
              AND studio_id = messages.studio_id
          )
        )
    )
  );

-- Users can delete attachments from messages they own
CREATE POLICY "Users can delete their message attachments"
  ON message_attachments
  FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM messages
      WHERE id = message_attachments.message_id
        AND (
          from_address = auth.uid()::TEXT
          OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND user_role IN ('admin', 'staff')
              AND studio_id = messages.studio_id
          )
        )
    )
  );

-- ============================================================================
-- MESSAGE_READ_STATUS POLICIES
-- ============================================================================

-- Users can view their own read status
CREATE POLICY "Users can view their read status"
  ON message_read_status
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can create read status for themselves
CREATE POLICY "Users can mark messages as read"
  ON message_read_status
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
  );

-- No updates to read status (it's immutable)
-- Users can delete their own read status (mark as unread)
CREATE POLICY "Users can delete their read status"
  ON message_read_status
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- MESSAGE_LABELS POLICIES
-- ============================================================================

-- Users can view labels in their studio
CREATE POLICY "Users can view studio labels"
  ON message_labels
  FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can create personal labels
CREATE POLICY "Users can create labels"
  ON message_labels
  FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND user_role IN ('admin', 'staff')
          AND studio_id = message_labels.studio_id
      )
    )
  );

-- Users can update their own labels, admin/staff can update any
CREATE POLICY "Users can update their labels"
  ON message_labels
  FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND user_role IN ('admin', 'staff')
          AND studio_id = message_labels.studio_id
      )
    )
  );

-- Users can delete their own labels, admin/staff can delete any
CREATE POLICY "Users can delete their labels"
  ON message_labels
  FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND user_role IN ('admin', 'staff')
          AND studio_id = message_labels.studio_id
      )
    )
  );

-- ============================================================================
-- MESSAGE_ASSIGNMENTS POLICIES
-- ============================================================================

-- Users can view assignments for messages they can access
CREATE POLICY "Users can view message assignments"
  ON message_assignments
  FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      assigned_to = auth.uid()
      OR assigned_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND user_role IN ('admin', 'staff')
          AND studio_id = message_assignments.studio_id
      )
    )
  );

-- Staff and admins can create assignments
CREATE POLICY "Staff can create assignments"
  ON message_assignments
  FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM profiles
      WHERE id = auth.uid()
        AND user_role IN ('admin', 'staff')
    )
    AND assigned_by = auth.uid()
  );

-- Staff and admins can update assignments
CREATE POLICY "Staff can update assignments"
  ON message_assignments
  FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM profiles
      WHERE id = auth.uid()
        AND user_role IN ('admin', 'staff')
    )
  );

-- Only admin can delete assignments
CREATE POLICY "Admin can delete assignments"
  ON message_assignments
  FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM profiles
      WHERE id = auth.uid()
        AND user_role = 'admin'
    )
  );

-- ============================================================================
-- INBOX_EMAIL_TEMPLATES POLICIES
-- ============================================================================

-- Users can view active templates in their studio
CREATE POLICY "Users can view email templates"
  ON inbox_email_templates
  FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      is_active = TRUE
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND user_role IN ('admin', 'staff')
          AND studio_id = inbox_email_templates.studio_id
      )
    )
  );

-- Staff and admins can create templates
CREATE POLICY "Staff can create email templates"
  ON inbox_email_templates
  FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM profiles
      WHERE id = auth.uid()
        AND user_role IN ('admin', 'staff')
    )
    AND created_by = auth.uid()
  );

-- Staff and admins can update templates
CREATE POLICY "Staff can update email templates"
  ON inbox_email_templates
  FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM profiles
      WHERE id = auth.uid()
        AND user_role IN ('admin', 'staff')
    )
  );

-- Only admin can delete templates
CREATE POLICY "Admin can delete email templates"
  ON inbox_email_templates
  FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM profiles
      WHERE id = auth.uid()
        AND user_role = 'admin'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to check if user has inbox access
CREATE OR REPLACE FUNCTION user_has_inbox_access(p_studio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND studio_id = p_studio_id
      AND user_role IN ('admin', 'staff', 'teacher', 'parent')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can assign messages
CREATE OR REPLACE FUNCTION user_can_assign_messages(p_studio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND studio_id = p_studio_id
      AND user_role IN ('admin', 'staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEXES FOR RLS PERFORMANCE
-- ============================================================================

-- Add indexes to support RLS policy queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON profiles(id, user_role, studio_id);
CREATE INDEX IF NOT EXISTS idx_profiles_studio_id_role ON profiles(studio_id, user_role);

-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================

COMMENT ON SCHEMA public IS 'Unified Inbox RLS Policies - Migration 20251121_002';
