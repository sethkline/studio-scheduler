-- Migration: Enhance Volunteer Management System
-- Story 2.1.5: Volunteer Coordination Center
-- Adds check-in tracking, capacity limits, emergency contacts, and email automation

-- Enhance volunteer_shifts table
ALTER TABLE volunteer_shifts
  ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parent_shift_id UUID REFERENCES volunteer_shifts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Enhance volunteer_signups table
ALTER TABLE volunteer_signups
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255),
  ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS thank_you_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_volunteer_shifts_recital ON volunteer_shifts(recital_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_shifts_date ON volunteer_shifts(shift_date, start_time);
CREATE INDEX IF NOT EXISTS idx_volunteer_signups_shift ON volunteer_signups(shift_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_signups_parent ON volunteer_signups(parent_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_signups_checked_in ON volunteer_signups(checked_in_at);

-- Create function to get current signup count for a shift
CREATE OR REPLACE FUNCTION get_volunteer_shift_signup_count(shift_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM volunteer_signups
  WHERE shift_id = shift_uuid
  AND status != 'cancelled';
$$ LANGUAGE SQL STABLE;

-- Create function to check if shift is full
CREATE OR REPLACE FUNCTION is_volunteer_shift_full(shift_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT get_volunteer_shift_signup_count(shift_uuid) >= COALESCE(capacity, 1)
  FROM volunteer_shifts
  WHERE id = shift_uuid;
$$ LANGUAGE SQL STABLE;

-- Create view for volunteer shift availability
CREATE OR REPLACE VIEW volunteer_shifts_with_availability AS
SELECT
  vs.*,
  get_volunteer_shift_signup_count(vs.id) as current_signups,
  vs.capacity,
  CASE
    WHEN get_volunteer_shift_signup_count(vs.id) >= COALESCE(vs.capacity, 1) THEN true
    ELSE false
  END as is_full,
  COALESCE(vs.capacity, 1) - get_volunteer_shift_signup_count(vs.id) as spots_remaining
FROM volunteer_shifts vs;

-- Grant access to the view
GRANT SELECT ON volunteer_shifts_with_availability TO authenticated;

-- Create table for volunteer email templates
CREATE TABLE IF NOT EXISTS volunteer_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(50) NOT NULL UNIQUE, -- 'confirmation', 'reminder', 'thank_you'
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  variables JSONB, -- List of available template variables
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default email templates
INSERT INTO volunteer_email_templates (template_type, subject, body_html, body_text, variables) VALUES
  (
    'confirmation',
    'Confirmed: Volunteer Shift for {{recital_name}}',
    '<h2>Thank you for volunteering!</h2>
    <p>Dear {{volunteer_name}},</p>
    <p>This confirms your volunteer shift for <strong>{{recital_name}}</strong>:</p>
    <ul>
      <li><strong>Role:</strong> {{shift_role}}</li>
      <li><strong>Date:</strong> {{shift_date}}</li>
      <li><strong>Time:</strong> {{start_time}} - {{end_time}}</li>
      <li><strong>Location:</strong> {{location}}</li>
    </ul>
    <p><strong>What to bring:</strong> Please arrive 15 minutes early and wear comfortable shoes.</p>
    <p>{{instructions}}</p>
    <p>If you need to cancel or have questions, please contact us at {{studio_email}} or {{studio_phone}}.</p>
    <p>Thank you for your support!</p>
    <p>{{studio_name}}</p>',
    'Thank you for volunteering!

Dear {{volunteer_name}},

This confirms your volunteer shift for {{recital_name}}:

Role: {{shift_role}}
Date: {{shift_date}}
Time: {{start_time}} - {{end_time}}
Location: {{location}}

What to bring: Please arrive 15 minutes early and wear comfortable shoes.

{{instructions}}

If you need to cancel or have questions, please contact us at {{studio_email}} or {{studio_phone}}.

Thank you for your support!

{{studio_name}}',
    '["recital_name", "volunteer_name", "shift_role", "shift_date", "start_time", "end_time", "location", "instructions", "studio_name", "studio_email", "studio_phone"]'::jsonb
  ),
  (
    'reminder',
    'Reminder: Volunteer Shift Tomorrow for {{recital_name}}',
    '<h2>Volunteer Shift Reminder</h2>
    <p>Dear {{volunteer_name}},</p>
    <p>This is a friendly reminder about your volunteer shift <strong>tomorrow</strong>:</p>
    <ul>
      <li><strong>Recital:</strong> {{recital_name}}</li>
      <li><strong>Role:</strong> {{shift_role}}</li>
      <li><strong>Date:</strong> {{shift_date}}</li>
      <li><strong>Time:</strong> {{start_time}} - {{end_time}}</li>
      <li><strong>Location:</strong> {{location}}</li>
    </ul>
    <p><strong>Check-in:</strong> Please arrive 15 minutes early to check in and receive your assignment.</p>
    <p>{{instructions}}</p>
    <p>We appreciate your help making this recital a success!</p>
    <p>{{studio_name}}</p>',
    'Volunteer Shift Reminder

Dear {{volunteer_name}},

This is a friendly reminder about your volunteer shift tomorrow:

Recital: {{recital_name}}
Role: {{shift_role}}
Date: {{shift_date}}
Time: {{start_time}} - {{end_time}}
Location: {{location}}

Check-in: Please arrive 15 minutes early to check in and receive your assignment.

{{instructions}}

We appreciate your help making this recital a success!

{{studio_name}}',
    '["recital_name", "volunteer_name", "shift_role", "shift_date", "start_time", "end_time", "location", "instructions", "studio_name"]'::jsonb
  ),
  (
    'thank_you',
    'Thank You for Volunteering at {{recital_name}}!',
    '<h2>Thank You!</h2>
    <p>Dear {{volunteer_name}},</p>
    <p>On behalf of everyone at {{studio_name}}, thank you so much for volunteering at <strong>{{recital_name}}</strong>!</p>
    <p>Your contribution as <strong>{{shift_role}}</strong> helped make our recital a huge success. We could not have done it without dedicated volunteers like you.</p>
    <p>We hope you enjoyed being part of this special event. If you have any photos or feedback to share, please don''t hesitate to reach out.</p>
    <p>We look forward to seeing you at future events!</p>
    <p>With gratitude,<br>{{studio_name}}</p>',
    'Thank You!

Dear {{volunteer_name}},

On behalf of everyone at {{studio_name}}, thank you so much for volunteering at {{recital_name}}!

Your contribution as {{shift_role}} helped make our recital a huge success. We could not have done it without dedicated volunteers like you.

We hope you enjoyed being part of this special event. If you have any photos or feedback to share, please don''t hesitate to reach out.

We look forward to seeing you at future events!

With gratitude,
{{studio_name}}',
    '["recital_name", "volunteer_name", "shift_role", "studio_name"]'::jsonb
  );

-- Enable RLS
ALTER TABLE volunteer_email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email templates
CREATE POLICY "Anyone can view email templates"
  ON volunteer_email_templates FOR SELECT
  USING (true);

CREATE POLICY "Admin and staff can manage email templates"
  ON volunteer_email_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );
