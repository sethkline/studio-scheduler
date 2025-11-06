-- Migration: Choreography Notes Feature
-- Story 5.3.4: Allow teachers to document choreography with notes, videos, music links, formations, and version history

-- Table: choreography_notes
-- Main table for storing choreography documentation linked to class instances
CREATE TABLE IF NOT EXISTS choreography_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_instance_id UUID NOT NULL REFERENCES class_instances(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  notes TEXT, -- Text notes with counts and detailed choreography
  music_title VARCHAR(255),
  music_artist VARCHAR(255),
  music_link TEXT, -- URL to music (Spotify, YouTube, etc.)
  video_url TEXT, -- Supabase Storage URL for uploaded routine video
  video_thumbnail_url TEXT, -- Optional thumbnail for video
  counts_notation TEXT, -- Structured counts (e.g., "8-count intro, 16-count chorus")
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1, -- Current version number
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Table: choreography_formations
-- Store dancer positions and formations for each section of choreography
CREATE TABLE IF NOT EXISTS choreography_formations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  choreography_note_id UUID NOT NULL REFERENCES choreography_notes(id) ON DELETE CASCADE,
  formation_name VARCHAR(255) NOT NULL, -- e.g., "Opening Formation", "Verse 1 Formation"
  formation_order INTEGER NOT NULL DEFAULT 0, -- Order of formation in the routine
  formation_data JSONB, -- Store positions, dancer names, stage positions as JSON
  stage_diagram_url TEXT, -- Optional: URL to uploaded stage diagram image
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: choreography_versions
-- Track version history of choreography notes
CREATE TABLE IF NOT EXISTS choreography_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  choreography_note_id UUID NOT NULL REFERENCES choreography_notes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  notes TEXT,
  music_title VARCHAR(255),
  music_artist VARCHAR(255),
  music_link TEXT,
  video_url TEXT,
  counts_notation TEXT,
  formations_snapshot JSONB, -- Snapshot of formations at this version
  change_summary TEXT, -- What changed in this version
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_choreography_notes_class_instance ON choreography_notes(class_instance_id);
CREATE INDEX IF NOT EXISTS idx_choreography_notes_teacher ON choreography_notes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_choreography_notes_active ON choreography_notes(is_active);
CREATE INDEX IF NOT EXISTS idx_choreography_formations_note ON choreography_formations(choreography_note_id);
CREATE INDEX IF NOT EXISTS idx_choreography_formations_order ON choreography_formations(choreography_note_id, formation_order);
CREATE INDEX IF NOT EXISTS idx_choreography_versions_note ON choreography_versions(choreography_note_id);
CREATE INDEX IF NOT EXISTS idx_choreography_versions_note_version ON choreography_versions(choreography_note_id, version);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE choreography_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE choreography_formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE choreography_versions ENABLE ROW LEVEL SECURITY;

-- choreography_notes policies
-- Teachers can view their own choreography notes
CREATE POLICY "Teachers can view their own choreography notes"
  ON choreography_notes FOR SELECT
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE id = (
        SELECT teacher_id FROM profiles WHERE id = auth.uid()
      )
    )
    OR
    -- Admin and staff can view all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

-- Teachers can create choreography notes for their classes
CREATE POLICY "Teachers can create their own choreography notes"
  ON choreography_notes FOR INSERT
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers WHERE id = (
        SELECT teacher_id FROM profiles WHERE id = auth.uid()
      )
    )
    OR
    -- Admin and staff can create
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

-- Teachers can update their own choreography notes
CREATE POLICY "Teachers can update their own choreography notes"
  ON choreography_notes FOR UPDATE
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE id = (
        SELECT teacher_id FROM profiles WHERE id = auth.uid()
      )
    )
    OR
    -- Admin and staff can update all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

-- Teachers can delete their own choreography notes
CREATE POLICY "Teachers can delete their own choreography notes"
  ON choreography_notes FOR DELETE
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE id = (
        SELECT teacher_id FROM profiles WHERE id = auth.uid()
      )
    )
    OR
    -- Admin can delete all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role = 'admin'
    )
  );

-- choreography_formations policies
-- Users who can view choreography notes can view formations
CREATE POLICY "Users can view formations for their choreography notes"
  ON choreography_formations FOR SELECT
  USING (
    choreography_note_id IN (
      SELECT id FROM choreography_notes
      WHERE teacher_id IN (
        SELECT id FROM teachers WHERE id = (
          SELECT teacher_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

-- Users who can update choreography notes can manage formations
CREATE POLICY "Users can manage formations for their choreography notes"
  ON choreography_formations FOR ALL
  USING (
    choreography_note_id IN (
      SELECT id FROM choreography_notes
      WHERE teacher_id IN (
        SELECT id FROM teachers WHERE id = (
          SELECT teacher_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

-- choreography_versions policies (read-only for most users)
CREATE POLICY "Users can view versions for their choreography notes"
  ON choreography_versions FOR SELECT
  USING (
    choreography_note_id IN (
      SELECT id FROM choreography_notes
      WHERE teacher_id IN (
        SELECT id FROM teachers WHERE id = (
          SELECT teacher_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

-- Only system/API can insert versions (handled by trigger)
CREATE POLICY "System can create version history"
  ON choreography_versions FOR INSERT
  WITH CHECK (true);

-- Function to automatically create version history on update
CREATE OR REPLACE FUNCTION create_choreography_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if actual content changed
  IF (OLD.notes IS DISTINCT FROM NEW.notes OR
      OLD.music_title IS DISTINCT FROM NEW.music_title OR
      OLD.music_link IS DISTINCT FROM NEW.music_link OR
      OLD.video_url IS DISTINCT FROM NEW.video_url OR
      OLD.counts_notation IS DISTINCT FROM NEW.counts_notation) THEN

    -- Increment version number
    NEW.version = OLD.version + 1;
    NEW.updated_at = NOW();

    -- Create version snapshot
    INSERT INTO choreography_versions (
      choreography_note_id,
      version,
      title,
      description,
      notes,
      music_title,
      music_artist,
      music_link,
      video_url,
      counts_notation,
      formations_snapshot,
      created_by
    )
    SELECT
      OLD.id,
      OLD.version,
      OLD.title,
      OLD.description,
      OLD.notes,
      OLD.music_title,
      OLD.music_artist,
      OLD.music_link,
      OLD.video_url,
      OLD.counts_notation,
      (SELECT jsonb_agg(f) FROM choreography_formations f WHERE f.choreography_note_id = OLD.id),
      auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create version history on choreography_notes update
DROP TRIGGER IF EXISTS trigger_create_choreography_version ON choreography_notes;
CREATE TRIGGER trigger_create_choreography_version
  BEFORE UPDATE ON choreography_notes
  FOR EACH ROW
  EXECUTE FUNCTION create_choreography_version();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_choreography_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for choreography_formations updated_at
DROP TRIGGER IF EXISTS trigger_update_choreography_formations_updated_at ON choreography_formations;
CREATE TRIGGER trigger_update_choreography_formations_updated_at
  BEFORE UPDATE ON choreography_formations
  FOR EACH ROW
  EXECUTE FUNCTION update_choreography_updated_at();

-- Comments for documentation
COMMENT ON TABLE choreography_notes IS 'Store choreography documentation for class instances with notes, music, videos, and version tracking';
COMMENT ON TABLE choreography_formations IS 'Store dancer formations and positions for choreography';
COMMENT ON TABLE choreography_versions IS 'Version history of choreography notes for tracking changes over time';
COMMENT ON COLUMN choreography_notes.counts_notation IS 'Structured notation for musical counts (e.g., "8-count intro, 16-count chorus")';
COMMENT ON COLUMN choreography_formations.formation_data IS 'JSON data storing dancer positions: {dancers: [{name: "Student Name", position: {x: 0, y: 0}, notes: "Center stage"}]}';
