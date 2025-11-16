-- Migration: Tier 1 - Rehearsal Management System
-- Adds comprehensive rehearsal scheduling and tracking

-- Create rehearsal types table
CREATE TABLE IF NOT EXISTS recital_rehearsals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recital_id UUID NOT NULL REFERENCES recitals(id) ON DELETE CASCADE,
  rehearsal_type VARCHAR(50) NOT NULL, -- 'tech', 'dress', 'stage', 'class', 'full'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rehearsal_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(255),
  room_id UUID,
  notes TEXT,

  -- Logistics
  requires_costumes BOOLEAN DEFAULT FALSE,
  requires_props BOOLEAN DEFAULT FALSE,
  requires_tech BOOLEAN DEFAULT FALSE,
  parents_allowed BOOLEAN DEFAULT FALSE,

  -- Status
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rehearsal participants table (which classes/performances are rehearsing)
CREATE TABLE IF NOT EXISTS rehearsal_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_id UUID NOT NULL REFERENCES recital_rehearsals(id) ON DELETE CASCADE,

  -- Can link to either a class or specific performance
  class_instance_id UUID REFERENCES class_instances(id) ON DELETE CASCADE,
  recital_performance_id UUID REFERENCES recital_performances(id) ON DELETE CASCADE,

  -- Timing for this participant
  call_time TIME,
  expected_duration INTEGER, -- minutes
  performance_order INTEGER,

  -- Notes specific to this participant
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure at least one link exists
  CONSTRAINT rehearsal_participant_link CHECK (
    class_instance_id IS NOT NULL OR recital_performance_id IS NOT NULL
  )
);

-- Create rehearsal attendance tracking
CREATE TABLE IF NOT EXISTS rehearsal_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_id UUID NOT NULL REFERENCES recital_rehearsals(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Attendance status
  status VARCHAR(50) DEFAULT 'expected', -- 'expected', 'present', 'absent', 'excused', 'late'
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,

  -- Notes and feedback
  notes TEXT,
  teacher_feedback TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint to prevent duplicate attendance records
  UNIQUE(rehearsal_id, student_id)
);

-- Create rehearsal videos/resources table
CREATE TABLE IF NOT EXISTS rehearsal_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_id UUID NOT NULL REFERENCES recital_rehearsals(id) ON DELETE CASCADE,

  resource_type VARCHAR(50) NOT NULL, -- 'video', 'audio', 'document', 'image', 'link'
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- File storage
  file_path VARCHAR(500),
  file_url TEXT,
  file_size INTEGER,
  file_type VARCHAR(100),

  -- Visibility
  is_public BOOLEAN DEFAULT FALSE,
  visible_to_parents BOOLEAN DEFAULT FALSE,

  -- Metadata
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rehearsals_recital ON recital_rehearsals(recital_id);
CREATE INDEX IF NOT EXISTS idx_rehearsals_date ON recital_rehearsals(rehearsal_date);
CREATE INDEX IF NOT EXISTS idx_rehearsals_status ON recital_rehearsals(status);
CREATE INDEX IF NOT EXISTS idx_rehearsal_participants_rehearsal ON rehearsal_participants(rehearsal_id);
CREATE INDEX IF NOT EXISTS idx_rehearsal_participants_class ON rehearsal_participants(class_instance_id);
CREATE INDEX IF NOT EXISTS idx_rehearsal_participants_performance ON rehearsal_participants(recital_performance_id);
CREATE INDEX IF NOT EXISTS idx_rehearsal_attendance_rehearsal ON rehearsal_attendance(rehearsal_id);
CREATE INDEX IF NOT EXISTS idx_rehearsal_attendance_student ON rehearsal_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_rehearsal_resources_rehearsal ON rehearsal_resources(rehearsal_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_rehearsal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_recital_rehearsals_updated_at ON recital_rehearsals;
CREATE TRIGGER update_recital_rehearsals_updated_at
  BEFORE UPDATE ON recital_rehearsals
  FOR EACH ROW
  EXECUTE FUNCTION update_rehearsal_updated_at();

DROP TRIGGER IF EXISTS update_rehearsal_participants_updated_at ON rehearsal_participants;
CREATE TRIGGER update_rehearsal_participants_updated_at
  BEFORE UPDATE ON rehearsal_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_rehearsal_updated_at();

DROP TRIGGER IF EXISTS update_rehearsal_attendance_updated_at ON rehearsal_attendance;
CREATE TRIGGER update_rehearsal_attendance_updated_at
  BEFORE UPDATE ON rehearsal_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_rehearsal_updated_at();

-- Create view for rehearsal summary with participant counts
CREATE OR REPLACE VIEW rehearsal_summary AS
SELECT
  r.*,
  COUNT(DISTINCT rp.id) as participant_count,
  COUNT(DISTINCT ra.id) as expected_attendance,
  COUNT(DISTINCT CASE WHEN ra.status = 'present' THEN ra.id END) as actual_attendance,
  COUNT(DISTINCT CASE WHEN ra.status = 'absent' THEN ra.id END) as absent_count
FROM recital_rehearsals r
LEFT JOIN rehearsal_participants rp ON r.id = rp.rehearsal_id
LEFT JOIN rehearsal_attendance ra ON r.id = ra.rehearsal_id
GROUP BY r.id;

-- Enable RLS
ALTER TABLE recital_rehearsals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehearsal_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehearsal_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehearsal_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rehearsals
CREATE POLICY "Staff can view all rehearsals"
  ON recital_rehearsals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff', 'teacher')
    )
  );

CREATE POLICY "Staff can manage rehearsals"
  ON recital_rehearsals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- RLS for participants
CREATE POLICY "Staff can view rehearsal participants"
  ON rehearsal_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff', 'teacher')
    )
  );

CREATE POLICY "Staff can manage rehearsal participants"
  ON rehearsal_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- RLS for attendance
CREATE POLICY "Staff can view attendance"
  ON rehearsal_attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff', 'teacher')
    )
  );

CREATE POLICY "Parents can view their children's attendance"
  ON rehearsal_attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_guardian_relationships sgr
      JOIN guardians g ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
      AND sgr.student_id = rehearsal_attendance.student_id
    )
  );

CREATE POLICY "Staff can manage attendance"
  ON rehearsal_attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff', 'teacher')
    )
  );

-- RLS for resources
CREATE POLICY "Public resources viewable by authenticated users"
  ON rehearsal_resources FOR SELECT
  USING (
    visible_to_parents = true
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff', 'teacher')
    )
  );

CREATE POLICY "Staff can manage rehearsal resources"
  ON rehearsal_resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff', 'teacher')
    )
  );

-- Grant permissions
GRANT SELECT ON rehearsal_summary TO authenticated;
