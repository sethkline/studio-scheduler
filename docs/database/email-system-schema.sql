-- Email Notification System Database Schema
-- Story 1.3.1: Email Notification System

-- ============================================================================
-- EMAIL TEMPLATES TABLE
-- Stores reusable email templates with MJML/HTML content
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE, -- e.g., 'enrollment-confirmation', 'payment-reminder'
  category VARCHAR(100) NOT NULL, -- 'enrollment', 'payment', 'recital', 'announcement', 'reminder'
  subject VARCHAR(500) NOT NULL,
  description TEXT,

  -- Template content
  mjml_content TEXT, -- MJML template for easy email design
  html_content TEXT NOT NULL, -- Compiled HTML version
  text_content TEXT NOT NULL, -- Plain text version

  -- Variables used in template (JSON array)
  -- e.g., ["parent_name", "student_name", "class_name", "date"]
  template_variables JSONB DEFAULT '[]'::jsonb,

  -- Studio branding
  use_studio_branding BOOLEAN DEFAULT true,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- System default templates

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_email_templates_slug ON email_templates(slug);
CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_active ON email_templates(is_active);

-- ============================================================================
-- EMAIL LOGS TABLE
-- Tracks all sent emails with delivery status
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template reference (if from a template)
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  template_slug VARCHAR(255),

  -- Recipient information
  recipient_email VARCHAR(500) NOT NULL,
  recipient_name VARCHAR(500),
  recipient_type VARCHAR(100), -- 'parent', 'teacher', 'student', 'admin'
  recipient_id UUID, -- ID of the parent/teacher/student

  -- Email content
  subject VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT NOT NULL,

  -- Sending details
  sent_from VARCHAR(500) NOT NULL,
  reply_to VARCHAR(500),
  cc VARCHAR(1000), -- Comma-separated emails
  bcc VARCHAR(1000), -- Comma-separated emails

  -- Mailgun details
  mailgun_message_id VARCHAR(500),
  mailgun_domain VARCHAR(255),

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'queued', -- 'queued', 'sending', 'sent', 'delivered', 'failed', 'bounced', 'complained'
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Analytics
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional data (e.g., order_id, show_id, etc.)
  sent_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_email_logs_recipient_email ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_recipient_id ON email_logs(recipient_id);
CREATE INDEX idx_email_logs_template_id ON email_logs(template_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX idx_email_logs_mailgun_message_id ON email_logs(mailgun_message_id);

-- ============================================================================
-- EMAIL QUEUE TABLE
-- Scheduled and batch emails waiting to be sent
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template reference
  template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,

  -- Recipient information
  recipient_email VARCHAR(500) NOT NULL,
  recipient_name VARCHAR(500),
  recipient_type VARCHAR(100),
  recipient_id UUID,

  -- Template variables (JSON object with values)
  template_data JSONB DEFAULT '{}'::jsonb,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  priority INTEGER DEFAULT 5, -- 1-10, higher = more important

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed', 'cancelled'
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,

  -- Reference to email log (after sending)
  email_log_id UUID REFERENCES email_logs(id) ON DELETE SET NULL,

  -- Batch information (for grouping related emails)
  batch_id UUID,
  batch_name VARCHAR(255),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for queue processing
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled_for ON email_queue(scheduled_for);
CREATE INDEX idx_email_queue_priority ON email_queue(priority DESC);
CREATE INDEX idx_email_queue_batch_id ON email_queue(batch_id);
CREATE INDEX idx_email_queue_recipient_email ON email_queue(recipient_email);

-- ============================================================================
-- EMAIL PREFERENCES TABLE
-- User email preferences and unsubscribe management
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email VARCHAR(500) NOT NULL UNIQUE, -- For non-authenticated users

  -- Unsubscribe token for secure unsubscribe links
  unsubscribe_token VARCHAR(500) UNIQUE NOT NULL,

  -- Global preferences
  email_enabled BOOLEAN DEFAULT true,
  unsubscribed_at TIMESTAMPTZ,

  -- Category preferences (can unsubscribe from specific types)
  enrollment_emails BOOLEAN DEFAULT true,
  payment_emails BOOLEAN DEFAULT true,
  recital_emails BOOLEAN DEFAULT true,
  announcement_emails BOOLEAN DEFAULT true,
  reminder_emails BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX idx_email_preferences_email ON email_preferences(email);
CREATE INDEX idx_email_preferences_unsubscribe_token ON email_preferences(unsubscribe_token);

-- ============================================================================
-- EMAIL BATCHES TABLE
-- Track batch email campaigns
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Template used
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,

  -- Batch details
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'completed', 'cancelled'
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_email_batches_status ON email_batches(status);
CREATE INDEX idx_email_batches_created_by ON email_batches(created_by);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

CREATE TRIGGER email_logs_updated_at BEFORE UPDATE ON email_logs
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

CREATE TRIGGER email_queue_updated_at BEFORE UPDATE ON email_queue
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

CREATE TRIGGER email_preferences_updated_at BEFORE UPDATE ON email_preferences
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

CREATE TRIGGER email_batches_updated_at BEFORE UPDATE ON email_batches
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

-- Function to generate unsubscribe token
CREATE OR REPLACE FUNCTION generate_unsubscribe_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unsubscribe_token IS NULL THEN
    NEW.unsubscribe_token = encode(gen_random_bytes(32), 'base64');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_preferences_token BEFORE INSERT ON email_preferences
  FOR EACH ROW EXECUTE FUNCTION generate_unsubscribe_token();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_batches ENABLE ROW LEVEL SECURITY;

-- Email Templates: Admin and staff can manage, everyone can read active templates
CREATE POLICY "Admin and staff can manage email templates" ON email_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Everyone can view active templates" ON email_templates
  FOR SELECT USING (is_active = true);

-- Email Logs: Admin and staff can view all, users can view their own
CREATE POLICY "Admin and staff can view all email logs" ON email_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Users can view their own email logs" ON email_logs
  FOR SELECT USING (recipient_id = auth.uid());

-- Email Queue: Admin and staff only
CREATE POLICY "Admin and staff can manage email queue" ON email_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Email Preferences: Users can manage their own
CREATE POLICY "Users can manage their own email preferences" ON email_preferences
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view email preferences by email" ON email_preferences
  FOR SELECT USING (
    email IN (
      SELECT email FROM profiles WHERE id = auth.uid()
    )
  );

-- Email Batches: Admin and staff only
CREATE POLICY "Admin and staff can manage email batches" ON email_batches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );
