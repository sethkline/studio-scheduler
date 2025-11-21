-- ============================================================================
-- Unified Inbox Database Schema
-- ============================================================================
-- This migration creates the complete database schema for the Unified Inbox
-- feature, including tables for messages, threads, attachments, and templates.
--
-- Tables created:
-- - message_threads: Groups related messages into conversations
-- - messages: Core message storage for all communication types
-- - message_attachments: File attachments for messages
-- - message_read_status: Track read status per user for internal messages
-- - email_templates_v2: Enhanced email templates (replaces existing email_templates)
-- - message_labels: Custom labels/tags for organizing messages
-- - message_assignments: Track assignment history
--
-- Author: Claude
-- Date: 2025-11-21
-- ============================================================================

-- ============================================================================
-- 1. MESSAGE THREADS TABLE
-- ============================================================================
-- Groups related messages into conversations. Supports email threading,
-- internal message chains, and parent-teacher communications.
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_threads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id         UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Thread Metadata
  subject           TEXT NOT NULL,
  thread_type       TEXT NOT NULL CHECK (thread_type IN (
    'email', 'internal', 'parent_communication', 'contact_inquiry', 'support'
  )),

  -- Participants (array of email addresses or user UUIDs)
  participants      TEXT[] NOT NULL,

  -- Status Management
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'resolved', 'archived', 'deleted'
  )),

  -- Thread Statistics
  last_message_at   TIMESTAMPTZ,
  message_count     INTEGER DEFAULT 0,
  unread_count      INTEGER DEFAULT 0,

  -- Assignment
  assigned_to       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at       TIMESTAMPTZ,
  assigned_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Organization
  is_starred        BOOLEAN DEFAULT FALSE,
  tags              TEXT[],

  -- Priority
  priority          TEXT DEFAULT 'normal' CHECK (priority IN (
    'low', 'normal', 'high', 'urgent'
  )),

  -- Metadata
  metadata          JSONB DEFAULT '{}'
);

-- Add indexes for common queries
CREATE INDEX idx_threads_studio_id ON message_threads(studio_id);
CREATE INDEX idx_threads_updated_at ON message_threads(studio_id, updated_at DESC);
CREATE INDEX idx_threads_assigned_to ON message_threads(studio_id, assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_threads_status ON message_threads(studio_id, status) WHERE status != 'deleted';
CREATE INDEX idx_threads_type ON message_threads(studio_id, thread_type);
CREATE INDEX idx_threads_tags ON message_threads USING GIN(tags);

-- Add trigger for updated_at
CREATE TRIGGER update_message_threads_updated_at
  BEFORE UPDATE ON message_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add table comment
COMMENT ON TABLE message_threads IS 'Groups related messages into threaded conversations';

-- ============================================================================
-- 2. MESSAGES TABLE
-- ============================================================================
-- Primary table for all message types: email, internal, parent communications,
-- system notifications, and contact form submissions.
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id             UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Message Type & Source
  message_type          TEXT NOT NULL CHECK (message_type IN (
    'email', 'internal', 'parent_communication',
    'system_notification', 'contact_form', 'sms'
  )),
  source                TEXT NOT NULL CHECK (source IN (
    'email_inbound', 'email_outbound', 'system', 'user', 'external'
  )),

  -- Content
  subject               TEXT NOT NULL,
  body                  TEXT NOT NULL,
  body_html             TEXT,
  preview               TEXT GENERATED ALWAYS AS (LEFT(body, 200)) STORED,

  -- Participants
  from_address          TEXT NOT NULL, -- Email or user_id
  from_name             TEXT,
  to_addresses          TEXT[] NOT NULL, -- Array of emails or user_ids
  cc_addresses          TEXT[],
  bcc_addresses         TEXT[],

  -- Thread Management
  thread_id             UUID REFERENCES message_threads(id) ON DELETE SET NULL,
  parent_message_id     UUID REFERENCES messages(id) ON DELETE SET NULL,
  in_reply_to           TEXT, -- Email Message-ID for threading

  -- Status & Assignment
  status                TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'read', 'in_progress', 'resolved', 'archived', 'deleted'
  )),
  priority              TEXT DEFAULT 'normal' CHECK (priority IN (
    'low', 'normal', 'high', 'urgent'
  )),
  assigned_to           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at           TIMESTAMPTZ,
  assigned_by           UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Email-Specific Fields
  email_message_id      TEXT, -- RFC 822 Message-ID
  email_headers         JSONB,

  -- Metadata
  metadata              JSONB DEFAULT '{}', -- Flexible for additional data
  tags                  TEXT[],

  -- Flags
  is_read               BOOLEAN DEFAULT FALSE,
  is_starred            BOOLEAN DEFAULT FALSE,
  requires_action       BOOLEAN DEFAULT FALSE,

  -- Soft Delete
  deleted_at            TIMESTAMPTZ,
  deleted_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Read Receipt Tracking
  read_at               TIMESTAMPTZ,
  read_by               UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX idx_messages_studio_id ON messages(studio_id);
CREATE INDEX idx_messages_type ON messages(studio_id, message_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_status ON messages(studio_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_thread ON messages(studio_id, thread_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_assigned ON messages(studio_id, assigned_to) WHERE assigned_to IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_messages_created ON messages(studio_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_email_id ON messages(email_message_id) WHERE email_message_id IS NOT NULL;
CREATE INDEX idx_messages_tags ON messages USING GIN(tags);
CREATE INDEX idx_messages_parent ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL;

-- Full-text search index
CREATE INDEX idx_messages_search ON messages USING GIN(
  to_tsvector('english', COALESCE(subject, '') || ' ' || COALESCE(body, ''))
) WHERE deleted_at IS NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint for email message IDs
CREATE UNIQUE INDEX idx_messages_email_id_unique ON messages(email_message_id) WHERE email_message_id IS NOT NULL;

-- Add table comment
COMMENT ON TABLE messages IS 'Primary storage for all message types including email, internal, and parent communications';

-- ============================================================================
-- 3. MESSAGE ATTACHMENTS TABLE
-- ============================================================================
-- Stores file attachments associated with messages. Files are stored in
-- Supabase Storage, this table tracks metadata and references.
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_attachments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id             UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  message_id            UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- File Information
  filename              TEXT NOT NULL,
  original_filename     TEXT NOT NULL,
  storage_path          TEXT NOT NULL, -- Supabase Storage path
  storage_bucket        TEXT NOT NULL DEFAULT 'message-attachments',
  mime_type             TEXT NOT NULL,
  file_size             INTEGER NOT NULL, -- Bytes

  -- Metadata
  is_inline             BOOLEAN DEFAULT FALSE,
  content_id            TEXT, -- For inline images in HTML emails

  -- Download tracking
  download_count        INTEGER DEFAULT 0,
  last_downloaded_at    TIMESTAMPTZ
);

-- Add indexes
CREATE INDEX idx_attachments_studio_id ON message_attachments(studio_id);
CREATE INDEX idx_attachments_message_id ON message_attachments(message_id);
CREATE INDEX idx_attachments_created ON message_attachments(created_at DESC);

-- Add table comment
COMMENT ON TABLE message_attachments IS 'File attachments for messages, stored in Supabase Storage';

-- ============================================================================
-- 4. MESSAGE READ STATUS TABLE
-- ============================================================================
-- Tracks read status per user for messages. Primarily used for internal
-- messages where multiple recipients need individual read tracking.
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_read_status (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id         UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  message_id        UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one read status per user per message
  UNIQUE(message_id, user_id)
);

-- Add indexes
CREATE INDEX idx_read_status_studio_id ON message_read_status(studio_id);
CREATE INDEX idx_read_status_message_id ON message_read_status(message_id);
CREATE INDEX idx_read_status_user_id ON message_read_status(user_id);

-- Add table comment
COMMENT ON TABLE message_read_status IS 'Tracks read status per user for internal messages';

-- ============================================================================
-- 5. MESSAGE LABELS TABLE
-- ============================================================================
-- Custom labels/tags for organizing messages. Allows users to create
-- their own organizational system.
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_labels (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id         UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Label Info
  name              TEXT NOT NULL,
  color             TEXT, -- Hex color code
  description       TEXT,

  -- Usage Statistics
  message_count     INTEGER DEFAULT 0,

  -- Ownership (null = studio-wide label)
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_system_label   BOOLEAN DEFAULT FALSE, -- System-defined labels

  -- Ensure unique labels per studio
  UNIQUE(studio_id, name)
);

-- Add indexes
CREATE INDEX idx_labels_studio_id ON message_labels(studio_id);
CREATE INDEX idx_labels_created_by ON message_labels(created_by) WHERE created_by IS NOT NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_message_labels_updated_at
  BEFORE UPDATE ON message_labels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add table comment
COMMENT ON TABLE message_labels IS 'Custom labels for organizing messages';

-- Insert default system labels
INSERT INTO message_labels (studio_id, name, color, description, is_system_label)
SELECT
  id,
  'Important',
  '#ef4444', -- Red
  'Mark important messages',
  true
FROM studios
UNION ALL
SELECT
  id,
  'Follow Up',
  '#f59e0b', -- Amber
  'Messages requiring follow-up',
  true
FROM studios
UNION ALL
SELECT
  id,
  'To Do',
  '#3b82f6', -- Blue
  'Action items',
  true
FROM studios;

-- ============================================================================
-- 6. MESSAGE ASSIGNMENTS TABLE
-- ============================================================================
-- Tracks assignment history for messages. Maintains an audit trail of who
-- was assigned to handle each message and when.
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_assignments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id         UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  message_id        UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Assignment Details
  assigned_to       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Assignment Notes
  notes             TEXT,

  -- Completion
  completed_at      TIMESTAMPTZ,
  completed_by      UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Add indexes
CREATE INDEX idx_assignments_studio_id ON message_assignments(studio_id);
CREATE INDEX idx_assignments_message_id ON message_assignments(message_id);
CREATE INDEX idx_assignments_assigned_to ON message_assignments(assigned_to);
CREATE INDEX idx_assignments_created ON message_assignments(created_at DESC);

-- Add table comment
COMMENT ON TABLE message_assignments IS 'Audit trail of message assignments';

-- ============================================================================
-- 7. ENHANCED EMAIL TEMPLATES TABLE
-- ============================================================================
-- Enhanced version of email templates specifically for inbox usage.
-- Supports variable substitution and MJML/HTML templates.
-- ============================================================================

CREATE TABLE IF NOT EXISTS inbox_email_templates (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id                 UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Template Info
  name                      TEXT NOT NULL,
  slug                      TEXT NOT NULL,
  description               TEXT,
  category                  TEXT, -- 'enrollment', 'billing', 'recital', etc.

  -- Content
  subject_template          TEXT NOT NULL, -- Supports {{variable}} syntax
  body_template             TEXT NOT NULL,
  body_html_template        TEXT,

  -- Variables
  available_variables       JSONB, -- {variable_name: description}

  -- Metadata
  is_active                 BOOLEAN DEFAULT TRUE,
  is_system_template        BOOLEAN DEFAULT FALSE,
  usage_count               INTEGER DEFAULT 0,
  last_used_at              TIMESTAMPTZ,

  -- Ownership
  created_by                UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Ensure unique slugs per studio
  UNIQUE(studio_id, slug)
);

-- Add indexes
CREATE INDEX idx_inbox_templates_studio_id ON inbox_email_templates(studio_id);
CREATE INDEX idx_inbox_templates_category ON inbox_email_templates(studio_id, category) WHERE is_active = TRUE;
CREATE INDEX idx_inbox_templates_active ON inbox_email_templates(studio_id, is_active);

-- Add trigger for updated_at
CREATE TRIGGER update_inbox_email_templates_updated_at
  BEFORE UPDATE ON inbox_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add table comment
COMMENT ON TABLE inbox_email_templates IS 'Email templates for inbox compose functionality';

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update thread statistics when messages are added/updated
CREATE OR REPLACE FUNCTION update_thread_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update thread statistics
  UPDATE message_threads
  SET
    message_count = (
      SELECT COUNT(*)
      FROM messages
      WHERE thread_id = NEW.thread_id
        AND deleted_at IS NULL
    ),
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.thread_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update thread stats on message insert
CREATE TRIGGER update_thread_stats_on_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.thread_id IS NOT NULL)
  EXECUTE FUNCTION update_thread_statistics();

-- Function to update unread count in threads
CREATE OR REPLACE FUNCTION update_thread_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE message_threads
  SET
    unread_count = (
      SELECT COUNT(*)
      FROM messages
      WHERE thread_id = NEW.thread_id
        AND is_read = FALSE
        AND deleted_at IS NULL
    ),
    updated_at = NOW()
  WHERE id = NEW.thread_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update unread count when message read status changes
CREATE TRIGGER update_thread_unread_on_read_status_change
  AFTER UPDATE OF is_read ON messages
  FOR EACH ROW
  WHEN (NEW.thread_id IS NOT NULL AND OLD.is_read IS DISTINCT FROM NEW.is_read)
  EXECUTE FUNCTION update_thread_unread_count();

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.metadata ? 'template_id' THEN
    UPDATE inbox_email_templates
    SET
      usage_count = usage_count + 1,
      last_used_at = NOW()
    WHERE id = (NEW.metadata->>'template_id')::UUID;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to track template usage
CREATE TRIGGER track_template_usage
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.message_type = 'email' AND NEW.metadata ? 'template_id')
  EXECUTE FUNCTION increment_template_usage();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite indexes for common query patterns
CREATE INDEX idx_messages_inbox_view ON messages(studio_id, status, created_at DESC)
  WHERE deleted_at IS NULL AND message_type IN ('email', 'internal', 'parent_communication');

CREATE INDEX idx_messages_unread ON messages(studio_id, is_read, created_at DESC)
  WHERE deleted_at IS NULL AND is_read = FALSE;

CREATE INDEX idx_threads_active ON message_threads(studio_id, status, updated_at DESC)
  WHERE status = 'active';

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant appropriate permissions (RLS policies will be added in next migration)
-- These tables need to be accessible to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON message_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_read_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_labels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON inbox_email_templates TO authenticated;

-- Grant sequence usage
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

COMMENT ON SCHEMA public IS 'Unified Inbox Schema - Migration 20251121_001';
