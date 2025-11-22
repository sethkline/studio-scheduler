-- Database tables for trial registrations and contact inquiries
-- Run this SQL in Supabase SQL Editor to create the necessary tables

-- Table for storing trial class registrations
CREATE TABLE IF NOT EXISTS trial_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Student information
  student_first_name TEXT NOT NULL,
  student_last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT,
  experience_level TEXT DEFAULT 'none',

  -- Parent/Guardian information
  parent_first_name TEXT NOT NULL,
  parent_last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,

  -- Class information
  class_id UUID REFERENCES class_definitions(id) ON DELETE SET NULL,
  preferred_date DATE NOT NULL,

  -- Additional information
  referral_source TEXT,
  comments TEXT,

  -- Agreements
  agreed_to_terms BOOLEAN NOT NULL DEFAULT false,
  agreed_to_waiver BOOLEAN NOT NULL DEFAULT false,
  marketing_consent BOOLEAN DEFAULT false,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'scheduled', 'completed', 'cancelled', 'no_show')),
  scheduled_time TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  notes TEXT
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trial_registrations_email ON trial_registrations(email);
CREATE INDEX IF NOT EXISTS idx_trial_registrations_status ON trial_registrations(status);
CREATE INDEX IF NOT EXISTS idx_trial_registrations_class_id ON trial_registrations(class_id);
CREATE INDEX IF NOT EXISTS idx_trial_registrations_preferred_date ON trial_registrations(preferred_date);
CREATE INDEX IF NOT EXISTS idx_trial_registrations_created_at ON trial_registrations(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trial_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trial_registrations_updated_at
  BEFORE UPDATE ON trial_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_trial_registrations_updated_at();

-- Table for storing contact form inquiries
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Inquiry details
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('enrollment', 'trial', 'schedule', 'pricing', 'recitals', 'general', 'feedback')),
  message TEXT NOT NULL,

  -- Status tracking
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Response tracking
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  response TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_email ON contact_inquiries(email);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status ON contact_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_inquiry_type ON contact_inquiries(inquiry_type);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON contact_inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_assigned_to ON contact_inquiries(assigned_to);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_inquiries_updated_at
  BEFORE UPDATE ON contact_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_inquiries_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE trial_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trial_registrations
-- Allow public to insert (for public registration form)
CREATE POLICY "Anyone can create trial registrations"
  ON trial_registrations
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow authenticated users with appropriate roles to view and update
CREATE POLICY "Admin and staff can view all trial registrations"
  ON trial_registrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can update trial registrations"
  ON trial_registrations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- RLS Policies for contact_inquiries
-- Allow public to insert (for public contact form)
CREATE POLICY "Anyone can create contact inquiries"
  ON contact_inquiries
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow authenticated users with appropriate roles to view and update
CREATE POLICY "Admin and staff can view all contact inquiries"
  ON contact_inquiries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can update contact inquiries"
  ON contact_inquiries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Add comments for documentation
COMMENT ON TABLE trial_registrations IS 'Stores trial class registration submissions from the public registration form';
COMMENT ON TABLE contact_inquiries IS 'Stores contact form submissions from the public contact form';

COMMENT ON COLUMN trial_registrations.status IS 'Status: pending (new submission), confirmed (staff confirmed), scheduled (time set), completed (trial done), cancelled, no_show';
COMMENT ON COLUMN contact_inquiries.status IS 'Status: new (not yet reviewed), in_progress (being handled), resolved (answered), closed (archived)';
