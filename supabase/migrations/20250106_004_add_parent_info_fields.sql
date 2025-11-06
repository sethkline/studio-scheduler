-- Migration: Add Parent Information Center Fields
-- Story 2.1.6: Parent Information Center
-- Adds fields for parent-facing recital information and guides

-- Add parent information fields to recitals table
ALTER TABLE recitals
  ADD COLUMN IF NOT EXISTS parent_info_content JSONB, -- Rich text content (TipTap JSON)
  ADD COLUMN IF NOT EXISTS arrival_instructions TEXT,
  ADD COLUMN IF NOT EXISTS what_to_bring TEXT,
  ADD COLUMN IF NOT EXISTS parking_info TEXT,
  ADD COLUMN IF NOT EXISTS photography_policy TEXT,
  ADD COLUMN IF NOT EXISTS backstage_rules TEXT,
  ADD COLUMN IF NOT EXISTS dress_code TEXT,
  ADD COLUMN IF NOT EXISTS weather_cancellation_policy TEXT,
  ADD COLUMN IF NOT EXISTS accessibility_info TEXT,
  ADD COLUMN IF NOT EXISTS faq JSONB, -- Array of {question, answer} objects
  ADD COLUMN IF NOT EXISTS parent_info_updated_at TIMESTAMPTZ;

-- Create table for downloadable parent resources
CREATE TABLE IF NOT EXISTS recital_parent_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recital_id UUID NOT NULL REFERENCES recitals(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),
  category VARCHAR(100), -- 'guide', 'checklist', 'map', 'schedule', 'other'
  is_public BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_parent_resources_recital ON recital_parent_resources(recital_id);
CREATE INDEX IF NOT EXISTS idx_parent_resources_category ON recital_parent_resources(category);

-- Insert default FAQ structure for new recitals
CREATE OR REPLACE FUNCTION initialize_recital_parent_info()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default FAQ if not provided
  IF NEW.faq IS NULL THEN
    NEW.faq := '[
      {
        "question": "What time should we arrive?",
        "answer": "Please arrive at least 30 minutes before your dancer''s call time to allow for check-in and preparation."
      },
      {
        "question": "Where do we check in?",
        "answer": "Check-in will be located at the main entrance. Look for signs directing you to the dancer check-in area."
      },
      {
        "question": "Can parents go backstage?",
        "answer": "For safety and crowd control, only authorized staff and volunteers are allowed backstage. Parents should drop dancers at check-in."
      },
      {
        "question": "What should my dancer bring?",
        "answer": "Dancers should bring all costumes, tights, shoes, and any props. Label everything with your dancer''s name."
      },
      {
        "question": "Can we take photos or video?",
        "answer": "Photography and videography policies will be announced before the show. Please respect our professional photographers."
      },
      {
        "question": "What if we need to leave early?",
        "answer": "If you must leave early, please sit near an aisle and exit quietly between performances to minimize disruption."
      },
      {
        "question": "Is there reserved seating?",
        "answer": "Seating information will be provided with your tickets. Please refer to your ticket for seating section details."
      },
      {
        "question": "What happens if there is bad weather?",
        "answer": "In case of severe weather, we will notify all families via email and text. Check our website for updates."
      }
    ]'::jsonb;
  END IF;

  -- Set default photography policy
  IF NEW.photography_policy IS NULL THEN
    NEW.photography_policy := 'Photography and videography are permitted for personal use only. Flash photography and recording devices that block views are prohibited. Professional recordings will be available for purchase after the show.';
  END IF;

  -- Set default backstage rules
  IF NEW.backstage_rules IS NULL THEN
    NEW.backstage_rules := 'Only dancers, staff, and authorized volunteers are permitted backstage. Parents must drop off dancers at check-in and pick up after the show. Please respect this policy for safety and space limitations.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize parent info
DROP TRIGGER IF EXISTS set_default_parent_info ON recitals;
CREATE TRIGGER set_default_parent_info
  BEFORE INSERT ON recitals
  FOR EACH ROW
  EXECUTE FUNCTION initialize_recital_parent_info();

-- Enable RLS
ALTER TABLE recital_parent_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parent resources
CREATE POLICY "Public resources are viewable by anyone"
  ON recital_parent_resources FOR SELECT
  USING (is_public = true);

CREATE POLICY "Staff can view all parent resources"
  ON recital_parent_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff', 'teacher')
    )
  );

CREATE POLICY "Staff can manage parent resources"
  ON recital_parent_resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );
