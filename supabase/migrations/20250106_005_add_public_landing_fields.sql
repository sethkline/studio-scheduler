-- Migration: Add Public Recital Landing Page Fields
-- Story 2.2.1: Public Recital Landing Page
-- Adds fields for public marketing page

-- Add public landing page fields to recitals table
ALTER TABLE recitals
  ADD COLUMN IF NOT EXISTS public_slug VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS hero_image_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS public_description TEXT,
  ADD COLUMN IF NOT EXISTS program_highlights TEXT,
  ADD COLUMN IF NOT EXISTS meta_description VARCHAR(300),
  ADD COLUMN IF NOT EXISTS meta_keywords VARCHAR(500),
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_countdown BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS enable_social_share BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS og_image_url VARCHAR(500); -- Open Graph image for social sharing

-- Add venue and accessibility information
ALTER TABLE recitals
  ADD COLUMN IF NOT EXISTS venue_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS venue_address TEXT,
  ADD COLUMN IF NOT EXISTS venue_map_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS venue_directions TEXT;

-- Create index on public_slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_recitals_public_slug ON recitals(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recitals_is_public ON recitals(is_public) WHERE is_public = true;

-- Create table for recital featured performers (optional spotlight section)
CREATE TABLE IF NOT EXISTS recital_featured_performers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recital_id UUID NOT NULL REFERENCES recitals(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  photo_url VARCHAR(500),
  performance_title VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for recital gallery images (public landing page)
CREATE TABLE IF NOT EXISTS recital_public_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recital_id UUID NOT NULL REFERENCES recitals(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  caption VARCHAR(500),
  alt_text VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  is_from_previous_year BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for public FAQ (separate from parent info FAQ)
CREATE TABLE IF NOT EXISTS recital_public_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recital_id UUID NOT NULL REFERENCES recitals(id) ON DELETE CASCADE,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100), -- 'tickets', 'venue', 'show', 'general'
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_featured_performers_recital ON recital_featured_performers(recital_id);
CREATE INDEX IF NOT EXISTS idx_public_gallery_recital ON recital_public_gallery(recital_id);
CREATE INDEX IF NOT EXISTS idx_public_faq_recital ON recital_public_faq(recital_id);
CREATE INDEX IF NOT EXISTS idx_public_faq_category ON recital_public_faq(category);

-- Function to generate slug from recital name
CREATE OR REPLACE FUNCTION generate_recital_slug(recital_name TEXT, recital_year INTEGER)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base slug: lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(recital_name || '-' || recital_year::TEXT, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  final_slug := base_slug;

  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM recitals WHERE public_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate slug if making recital public
CREATE OR REPLACE FUNCTION auto_generate_public_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- If making public and no slug exists, generate one
  IF NEW.is_public = true AND (NEW.public_slug IS NULL OR NEW.public_slug = '') THEN
    NEW.public_slug := generate_recital_slug(NEW.name, EXTRACT(YEAR FROM NEW.date)::INTEGER);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_slug_on_public
  BEFORE INSERT OR UPDATE ON recitals
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_public_slug();

-- Insert default public FAQ entries when recital is made public
CREATE OR REPLACE FUNCTION initialize_public_faq()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert defaults if making public for the first time
  IF NEW.is_public = true AND OLD.is_public = false THEN
    INSERT INTO recital_public_faq (recital_id, question, answer, category, sort_order) VALUES
      (NEW.id, 'How do I purchase tickets?', 'Click the "Purchase Tickets" button above to view available shows and select your seats.', 'tickets', 1),
      (NEW.id, 'When do ticket sales close?', 'Online ticket sales close 2 hours before each show. Limited tickets may be available at the door.', 'tickets', 2),
      (NEW.id, 'Can I choose my seats?', 'Yes! Our interactive seating chart lets you select your preferred seats based on availability.', 'tickets', 3),
      (NEW.id, 'Is there reserved seating?', 'All tickets are for reserved seats. Your seat location will be shown on your ticket.', 'tickets', 4),
      (NEW.id, 'What is your refund policy?', 'Tickets are non-refundable but may be exchanged for another show date subject to availability.', 'tickets', 5),
      (NEW.id, 'How long is the show?', 'The show typically runs 2-2.5 hours including an intermission.', 'show', 6),
      (NEW.id, 'Is there an intermission?', 'Yes, there will be one 15-minute intermission approximately halfway through the show.', 'show', 7),
      (NEW.id, 'Can I take photos?', 'Photography policies will be announced before the show. Professional photos will be available for purchase.', 'show', 8),
      (NEW.id, 'Where is the venue located?', 'Venue information including address and directions can be found in the "Venue & Parking" section above.', 'venue', 9),
      (NEW.id, 'Is parking available?', 'Yes, parking information and directions are provided above.', 'venue', 10);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_default_public_faq ON recitals;
CREATE TRIGGER create_default_public_faq
  AFTER UPDATE ON recitals
  FOR EACH ROW
  WHEN (NEW.is_public = true AND OLD.is_public = false)
  EXECUTE FUNCTION initialize_public_faq();

-- Enable RLS
ALTER TABLE recital_featured_performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recital_public_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE recital_public_faq ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public pages are viewable by anyone if recital is public
CREATE POLICY "Featured performers viewable if recital is public"
  ON recital_featured_performers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recitals
      WHERE recitals.id = recital_id
      AND recitals.is_public = true
    )
  );

CREATE POLICY "Staff can manage featured performers"
  ON recital_featured_performers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Public gallery viewable if recital is public"
  ON recital_public_gallery FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recitals
      WHERE recitals.id = recital_id
      AND recitals.is_public = true
    )
  );

CREATE POLICY "Staff can manage public gallery"
  ON recital_public_gallery FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Active FAQ viewable if recital is public"
  ON recital_public_faq FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM recitals
      WHERE recitals.id = recital_id
      AND recitals.is_public = true
    )
  );

CREATE POLICY "Staff can manage public FAQ"
  ON recital_public_faq FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );
