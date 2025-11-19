-- Migration: Add Recital Media Hub
-- Story 2.1.4: Recital Media Hub
-- Adds media gallery with student tagging for recitals

-- Create recital media table
CREATE TABLE IF NOT EXISTS recital_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recital_id UUID NOT NULL REFERENCES recitals(id) ON DELETE CASCADE,
  show_id UUID REFERENCES recital_shows(id) ON DELETE CASCADE,
  performance_id UUID REFERENCES recital_performances(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- 'photo' or 'video'
  thumbnail_path VARCHAR(500),
  title VARCHAR(255),
  description TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  is_public BOOLEAN DEFAULT FALSE,
  watermarked BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  file_size INTEGER, -- in bytes
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- for videos, in seconds
  metadata JSONB -- additional metadata (camera info, etc.)
);

-- Create table for student tags in media
CREATE TABLE IF NOT EXISTS recital_media_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES recital_media(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tagged_by UUID REFERENCES profiles(id),
  tagged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(media_id, student_id)
);

-- Create table for media galleries/albums
CREATE TABLE IF NOT EXISTS recital_media_galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recital_id UUID NOT NULL REFERENCES recitals(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_id UUID REFERENCES recital_media(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(100) UNIQUE, -- for public sharing links
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sort_order INTEGER DEFAULT 0
);

-- Create junction table for media in galleries
CREATE TABLE IF NOT EXISTS recital_media_gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES recital_media_galleries(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES recital_media(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gallery_id, media_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_recital_media_recital ON recital_media(recital_id);
CREATE INDEX IF NOT EXISTS idx_recital_media_show ON recital_media(show_id);
CREATE INDEX IF NOT EXISTS idx_recital_media_performance ON recital_media(performance_id);
CREATE INDEX IF NOT EXISTS idx_recital_media_uploaded_at ON recital_media(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_recital_media_type ON recital_media(file_type);
CREATE INDEX IF NOT EXISTS idx_recital_media_public ON recital_media(is_public);

CREATE INDEX IF NOT EXISTS idx_media_tags_media ON recital_media_tags(media_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_student ON recital_media_tags(student_id);

CREATE INDEX IF NOT EXISTS idx_media_galleries_recital ON recital_media_galleries(recital_id);
CREATE INDEX IF NOT EXISTS idx_media_galleries_share_token ON recital_media_galleries(share_token);

CREATE INDEX IF NOT EXISTS idx_gallery_items_gallery ON recital_media_gallery_items(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_items_media ON recital_media_gallery_items(media_id);

-- Create view for media with tag counts
CREATE OR REPLACE VIEW recital_media_with_stats AS
SELECT
  rm.*,
  COUNT(DISTINCT rmt.student_id) as tag_count,
  COUNT(DISTINCT rmgi.gallery_id) as gallery_count
FROM recital_media rm
LEFT JOIN recital_media_tags rmt ON rm.id = rmt.media_id
LEFT JOIN recital_media_gallery_items rmgi ON rm.id = rmgi.media_id
GROUP BY rm.id;

-- Grant access to the view
GRANT SELECT ON recital_media_with_stats TO authenticated;

-- Create function to get media for a student (for parents)
CREATE OR REPLACE FUNCTION get_student_recital_media(student_uuid UUID)
RETURNS TABLE (
  media_id UUID,
  recital_id UUID,
  file_path VARCHAR,
  file_type VARCHAR,
  thumbnail_path VARCHAR,
  title VARCHAR,
  uploaded_at TIMESTAMPTZ
) AS $$
  SELECT
    rm.id,
    rm.recital_id,
    rm.file_path,
    rm.file_type,
    rm.thumbnail_path,
    rm.title,
    rm.uploaded_at
  FROM recital_media rm
  INNER JOIN recital_media_tags rmt ON rm.id = rmt.media_id
  WHERE rmt.student_id = student_uuid
  ORDER BY rm.uploaded_at DESC;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Create function to generate share token for gallery
CREATE OR REPLACE FUNCTION generate_gallery_share_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_token IS NULL AND NEW.is_public = true THEN
    NEW.share_token := encode(gen_random_bytes(16), 'base64');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_gallery_share_token
  BEFORE INSERT OR UPDATE ON recital_media_galleries
  FOR EACH ROW
  EXECUTE FUNCTION generate_gallery_share_token();

-- Enable RLS
ALTER TABLE recital_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE recital_media_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE recital_media_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE recital_media_gallery_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recital_media
CREATE POLICY "Public media is viewable by anyone"
  ON recital_media FOR SELECT
  USING (is_public = true);

CREATE POLICY "Staff can view all recital media"
  ON recital_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Parents can view media of their students"
  ON recital_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recital_media_tags rmt
      INNER JOIN students s ON rmt.student_id = s.id
      WHERE rmt.media_id = recital_media.id
      AND s.parent_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage all recital media"
  ON recital_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- RLS Policies for recital_media_tags
CREATE POLICY "Anyone can view media tags if they can view the media"
  ON recital_media_tags FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM recital_media WHERE id = media_id)
  );

CREATE POLICY "Staff can manage media tags"
  ON recital_media_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- RLS Policies for recital_media_galleries
CREATE POLICY "Public galleries are viewable by anyone"
  ON recital_media_galleries FOR SELECT
  USING (is_public = true);

CREATE POLICY "Staff can view all galleries"
  ON recital_media_galleries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff', 'teacher')
    )
  );

CREATE POLICY "Staff can manage galleries"
  ON recital_media_galleries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- RLS Policies for recital_media_gallery_items
CREATE POLICY "Users can view gallery items if they can view the gallery"
  ON recital_media_gallery_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM recital_media_galleries WHERE id = gallery_id)
  );

CREATE POLICY "Staff can manage gallery items"
  ON recital_media_gallery_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );
