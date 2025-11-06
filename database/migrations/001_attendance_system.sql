-- =====================================================
-- Attendance & Check-In System Migration
-- Version: 1.0
-- Description: Creates all tables, indexes, views, and triggers for the attendance system
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: attendance
-- Tracks student check-ins and attendance for each class
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_instance_id UUID NOT NULL REFERENCES public.class_instances(id) ON DELETE CASCADE,
    schedule_class_id UUID REFERENCES public.schedule_classes(id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'excused', 'tardy', 'left_early')),
    is_makeup BOOLEAN NOT NULL DEFAULT false,
    original_absence_id UUID REFERENCES public.absences(id) ON DELETE SET NULL,
    marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for attendance table
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_instance_id ON public.attendance(class_instance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance(class_instance_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_status ON public.attendance(student_id, status);

-- Unique constraint to prevent duplicate attendance records
CREATE UNIQUE INDEX IF NOT EXISTS unique_attendance_record
  ON public.attendance(student_id, class_instance_id, attendance_date);

-- =====================================================
-- TABLE: absences
-- Tracks planned and unplanned absences with reasons
-- =====================================================
CREATE TABLE IF NOT EXISTS public.absences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_instance_id UUID NOT NULL REFERENCES public.class_instances(id) ON DELETE CASCADE,
    absence_date DATE NOT NULL,
    absence_type VARCHAR(20) NOT NULL DEFAULT 'unplanned' CHECK (absence_type IN ('planned', 'unplanned')),
    reason VARCHAR(50) CHECK (reason IN ('illness', 'vacation', 'family_emergency', 'school_conflict', 'other', NULL)),
    reason_notes TEXT,
    is_excused BOOLEAN NOT NULL DEFAULT false,
    excused_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    excused_at TIMESTAMP WITH TIME ZONE,
    makeup_credit_granted BOOLEAN NOT NULL DEFAULT false,
    makeup_credit_id UUID,
    reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notification_sent BOOLEAN NOT NULL DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for absences table
CREATE INDEX IF NOT EXISTS idx_absences_student_id ON public.absences(student_id);
CREATE INDEX IF NOT EXISTS idx_absences_class_instance_id ON public.absences(class_instance_id);
CREATE INDEX IF NOT EXISTS idx_absences_date ON public.absences(absence_date);
CREATE INDEX IF NOT EXISTS idx_absences_student_date ON public.absences(student_id, absence_date);
CREATE INDEX IF NOT EXISTS idx_absences_student_class ON public.absences(student_id, class_instance_id);

-- =====================================================
-- TABLE: makeup_credits
-- Tracks available makeup class credits for students
-- =====================================================
CREATE TABLE IF NOT EXISTS public.makeup_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_instance_id UUID NOT NULL REFERENCES public.class_instances(id) ON DELETE CASCADE,
    absence_id UUID REFERENCES public.absences(id) ON DELETE SET NULL,
    credits_available INTEGER NOT NULL DEFAULT 1,
    credits_used INTEGER NOT NULL DEFAULT 0,
    granted_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CHECK (credits_used <= credits_available)
);

-- Indexes for makeup_credits table
CREATE INDEX IF NOT EXISTS idx_makeup_credits_student_id ON public.makeup_credits(student_id);
CREATE INDEX IF NOT EXISTS idx_makeup_credits_status ON public.makeup_credits(status);
CREATE INDEX IF NOT EXISTS idx_makeup_credits_expiration ON public.makeup_credits(expiration_date);
CREATE INDEX IF NOT EXISTS idx_makeup_credits_student_status ON public.makeup_credits(student_id, status);

-- Add foreign key from absences to makeup_credits (had to wait until table exists)
ALTER TABLE public.absences
ADD CONSTRAINT fk_absences_makeup_credit
FOREIGN KEY (makeup_credit_id) REFERENCES public.makeup_credits(id) ON DELETE SET NULL;

-- =====================================================
-- TABLE: makeup_bookings
-- Tracks when makeup credits are used to attend different classes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.makeup_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    makeup_credit_id UUID NOT NULL REFERENCES public.makeup_credits(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    original_class_instance_id UUID NOT NULL REFERENCES public.class_instances(id) ON DELETE CASCADE,
    makeup_class_instance_id UUID NOT NULL REFERENCES public.class_instances(id) ON DELETE CASCADE,
    makeup_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'attended', 'cancelled', 'no_show')),
    booked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    attendance_id UUID REFERENCES public.attendance(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for makeup_bookings table
CREATE INDEX IF NOT EXISTS idx_makeup_bookings_credit_id ON public.makeup_bookings(makeup_credit_id);
CREATE INDEX IF NOT EXISTS idx_makeup_bookings_student_id ON public.makeup_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_makeup_bookings_makeup_class ON public.makeup_bookings(makeup_class_instance_id);
CREATE INDEX IF NOT EXISTS idx_makeup_bookings_date ON public.makeup_bookings(makeup_date);
CREATE INDEX IF NOT EXISTS idx_makeup_bookings_status ON public.makeup_bookings(status);
CREATE INDEX IF NOT EXISTS idx_makeup_bookings_student_date ON public.makeup_bookings(student_id, makeup_date);

-- Add foreign key from attendance to absences (now that absences table exists)
ALTER TABLE public.attendance
ADD CONSTRAINT fk_attendance_original_absence
FOREIGN KEY (original_absence_id) REFERENCES public.absences(id) ON DELETE SET NULL;

-- =====================================================
-- TABLE: attendance_notes
-- Stores additional notes about student attendance and behavior
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id UUID REFERENCES public.attendance(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    note_type VARCHAR(30) NOT NULL CHECK (note_type IN ('behavior', 'progress', 'concern', 'achievement', 'injury', 'general')),
    note_text TEXT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT false,
    visibility VARCHAR(20) NOT NULL DEFAULT 'staff_only' CHECK (visibility IN ('admin_only', 'staff_only', 'teachers', 'parents')),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for attendance_notes table
CREATE INDEX IF NOT EXISTS idx_attendance_notes_attendance_id ON public.attendance_notes(attendance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_notes_student_id ON public.attendance_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_notes_type ON public.attendance_notes(note_type);

-- =====================================================
-- TABLE: student_qr_codes
-- Stores QR code information for quick check-in
-- =====================================================
CREATE TABLE IF NOT EXISTS public.student_qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
    qr_code_data TEXT NOT NULL UNIQUE,
    qr_code_image_url TEXT,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for student_qr_codes table
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_qr_codes_student_id ON public.student_qr_codes(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_qr_codes_qr_data ON public.student_qr_codes(qr_code_data);

-- =====================================================
-- TABLE: attendance_alerts
-- Tracks attendance patterns and alerts for concerning patterns
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('consecutive_absences', 'low_attendance', 'excessive_tardiness', 'custom')),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    alert_message TEXT NOT NULL,
    alert_date DATE NOT NULL DEFAULT CURRENT_DATE,
    date_range_start DATE,
    date_range_end DATE,
    metrics JSONB,
    is_acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    action_taken TEXT,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for attendance_alerts table
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_student_id ON public.attendance_alerts(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_type ON public.attendance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_severity ON public.attendance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_date ON public.attendance_alerts(alert_date);
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_unresolved ON public.attendance_alerts(is_resolved, alert_date);

-- =====================================================
-- TRIGGERS: Auto-update updated_at timestamps
-- =====================================================

-- Create or replace the trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS update_attendance_updated_at ON public.attendance;
CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_absences_updated_at ON public.absences;
CREATE TRIGGER update_absences_updated_at
BEFORE UPDATE ON public.absences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_makeup_credits_updated_at ON public.makeup_credits;
CREATE TRIGGER update_makeup_credits_updated_at
BEFORE UPDATE ON public.makeup_credits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_makeup_bookings_updated_at ON public.makeup_bookings;
CREATE TRIGGER update_makeup_bookings_updated_at
BEFORE UPDATE ON public.makeup_bookings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_notes_updated_at ON public.attendance_notes;
CREATE TRIGGER update_attendance_notes_updated_at
BEFORE UPDATE ON public.attendance_notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_qr_codes_updated_at ON public.student_qr_codes;
CREATE TRIGGER update_student_qr_codes_updated_at
BEFORE UPDATE ON public.student_qr_codes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_alerts_updated_at ON public.attendance_alerts;
CREATE TRIGGER update_attendance_alerts_updated_at
BEFORE UPDATE ON public.attendance_alerts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER: Auto-generate makeup credits when absence is excused
-- =====================================================

CREATE OR REPLACE FUNCTION generate_makeup_credit()
RETURNS TRIGGER AS $$
DECLARE
  term_end_date date;
  credit_id uuid;
BEGIN
  -- Only process if absence is excused and credit hasn't been granted yet
  IF NEW.is_excused = true AND (OLD.is_excused = false OR OLD.is_excused IS NULL) AND NEW.makeup_credit_granted = false THEN
    -- Get term end date from the schedule
    SELECT s.end_date INTO term_end_date
    FROM schedule_classes sc
    JOIN schedules s ON s.id = sc.schedule_id
    WHERE sc.class_instance_id = NEW.class_instance_id
    LIMIT 1;

    -- Create makeup credit
    INSERT INTO makeup_credits (
      student_id,
      class_instance_id,
      absence_id,
      credits_available,
      credits_used,
      granted_date,
      expiration_date,
      status,
      granted_by
    ) VALUES (
      NEW.student_id,
      NEW.class_instance_id,
      NEW.id,
      1,
      0,
      CURRENT_DATE,
      COALESCE(term_end_date, CURRENT_DATE + INTERVAL '90 days'),
      'active',
      NEW.excused_by
    )
    RETURNING id INTO credit_id;

    -- Update absence to indicate credit was granted
    NEW.makeup_credit_granted := true;
    NEW.makeup_credit_id := credit_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_makeup_credit ON public.absences;
CREATE TRIGGER trigger_generate_makeup_credit
BEFORE UPDATE ON public.absences
FOR EACH ROW
EXECUTE FUNCTION generate_makeup_credit();

-- =====================================================
-- VIEWS: Helpful views for common queries
-- =====================================================

-- View: Student attendance summary per class
CREATE OR REPLACE VIEW v_student_attendance_summary AS
SELECT
  s.id as student_id,
  s.first_name,
  s.last_name,
  ci.id as class_instance_id,
  ci.name as class_name,
  COUNT(*) as total_classes,
  SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as classes_attended,
  SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as classes_absent,
  SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as classes_excused,
  SUM(CASE WHEN a.status = 'tardy' THEN 1 ELSE 0 END) as times_tardy,
  ROUND(
    CASE
      WHEN COUNT(*) > 0 THEN
        (SUM(CASE WHEN a.status IN ('present', 'tardy') THEN 1 ELSE 0 END)::numeric /
         COUNT(*)::numeric * 100)
      ELSE 0
    END, 2
  ) as attendance_percentage
FROM students s
JOIN enrollments e ON e.student_id = s.id
JOIN class_instances ci ON ci.id = e.class_instance_id
LEFT JOIN attendance a ON a.student_id = s.id AND a.class_instance_id = ci.id
GROUP BY s.id, s.first_name, s.last_name, ci.id, ci.name;

-- View: Available makeup credits per student
CREATE OR REPLACE VIEW v_makeup_credits_available AS
SELECT
  s.id as student_id,
  s.first_name,
  s.last_name,
  ci.id as class_instance_id,
  ci.name as class_name,
  mc.id as credit_id,
  mc.credits_available - mc.credits_used as remaining_credits,
  mc.expiration_date,
  mc.granted_date,
  ab.absence_date,
  ab.reason
FROM students s
JOIN makeup_credits mc ON mc.student_id = s.id
JOIN class_instances ci ON ci.id = mc.class_instance_id
LEFT JOIN absences ab ON ab.id = mc.absence_id
WHERE mc.status = 'active'
  AND mc.expiration_date >= CURRENT_DATE
  AND mc.credits_available > mc.credits_used
ORDER BY mc.expiration_date ASC;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.makeup_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.makeup_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_alerts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: attendance table
-- =====================================================

-- Admin and staff can view all attendance
CREATE POLICY "Admin and staff can view all attendance" ON public.attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

-- Teachers can view attendance for their classes
CREATE POLICY "Teachers can view attendance for their classes" ON public.attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN class_instances ci ON ci.teacher_id = p.id
      WHERE p.id = auth.uid()
      AND p.user_role = 'teacher'
      AND ci.id = attendance.class_instance_id
    )
  );

-- Parents can view attendance for their students
CREATE POLICY "Parents can view attendance for their students" ON public.attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guardians g
      JOIN student_guardian_relationships sgr ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
      AND sgr.student_id = attendance.student_id
    )
  );

-- Admin and staff can manage attendance
CREATE POLICY "Admin and staff can manage attendance" ON public.attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

-- Teachers can create/update attendance for their classes
CREATE POLICY "Teachers can manage attendance for their classes" ON public.attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN class_instances ci ON ci.teacher_id = p.id
      WHERE p.id = auth.uid()
      AND p.user_role = 'teacher'
      AND ci.id = attendance.class_instance_id
    )
  );

CREATE POLICY "Teachers can update attendance for their classes" ON public.attendance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN class_instances ci ON ci.teacher_id = p.id
      WHERE p.id = auth.uid()
      AND p.user_role = 'teacher'
      AND ci.id = attendance.class_instance_id
    )
  );

-- =====================================================
-- RLS POLICIES: absences table
-- =====================================================

CREATE POLICY "Admin and staff can view all absences" ON public.absences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Teachers can view absences for their classes" ON public.absences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN class_instances ci ON ci.teacher_id = p.id
      WHERE p.id = auth.uid()
      AND ci.id = absences.class_instance_id
    )
  );

CREATE POLICY "Parents can view absences for their students" ON public.absences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guardians g
      JOIN student_guardian_relationships sgr ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
      AND sgr.student_id = absences.student_id
    )
  );

CREATE POLICY "Admin and staff can manage absences" ON public.absences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Parents can report absences for their students" ON public.absences
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM guardians g
      JOIN student_guardian_relationships sgr ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
      AND sgr.student_id = absences.student_id
    )
  );

-- =====================================================
-- RLS POLICIES: makeup_credits table
-- =====================================================

CREATE POLICY "Admin and staff can view all makeup credits" ON public.makeup_credits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Parents can view makeup credits for their students" ON public.makeup_credits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guardians g
      JOIN student_guardian_relationships sgr ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
      AND sgr.student_id = makeup_credits.student_id
    )
  );

CREATE POLICY "Admin and staff can manage makeup credits" ON public.makeup_credits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

-- =====================================================
-- RLS POLICIES: makeup_bookings table
-- =====================================================

CREATE POLICY "Admin and staff can view all makeup bookings" ON public.makeup_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Parents can view makeup bookings for their students" ON public.makeup_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guardians g
      JOIN student_guardian_relationships sgr ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
      AND sgr.student_id = makeup_bookings.student_id
    )
  );

CREATE POLICY "Admin and staff can manage makeup bookings" ON public.makeup_bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Parents can create makeup bookings for their students" ON public.makeup_bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM guardians g
      JOIN student_guardian_relationships sgr ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
      AND sgr.student_id = makeup_bookings.student_id
    )
  );

-- =====================================================
-- RLS POLICIES: attendance_notes table
-- =====================================================

CREATE POLICY "Admin can view all attendance notes" ON public.attendance_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role = 'admin'
    )
  );

CREATE POLICY "Staff can view non-admin-only notes" ON public.attendance_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    ) AND visibility != 'admin_only'
  );

CREATE POLICY "Teachers can view teacher-visible notes" ON public.attendance_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role = 'teacher'
    ) AND visibility IN ('teachers', 'parents')
  );

CREATE POLICY "Admin and staff can create notes" ON public.attendance_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

-- =====================================================
-- RLS POLICIES: student_qr_codes table
-- =====================================================

CREATE POLICY "Admin and staff can view all QR codes" ON public.student_qr_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Parents can view QR codes for their students" ON public.student_qr_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guardians g
      JOIN student_guardian_relationships sgr ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
      AND sgr.student_id = student_qr_codes.student_id
    )
  );

CREATE POLICY "Admin and staff can manage QR codes" ON public.student_qr_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

-- =====================================================
-- RLS POLICIES: attendance_alerts table
-- =====================================================

CREATE POLICY "Admin and staff can view all alerts" ON public.attendance_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can manage alerts" ON public.attendance_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.absences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.makeup_credits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.makeup_bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_qr_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_alerts TO authenticated;

GRANT SELECT ON v_student_attendance_summary TO authenticated;
GRANT SELECT ON v_makeup_credits_available TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.attendance IS 'Tracks student check-ins and attendance for each class';
COMMENT ON TABLE public.absences IS 'Tracks planned and unplanned absences with reasons';
COMMENT ON TABLE public.makeup_credits IS 'Tracks available makeup class credits for students';
COMMENT ON TABLE public.makeup_bookings IS 'Tracks when makeup credits are used to attend different classes';
COMMENT ON TABLE public.attendance_notes IS 'Stores additional notes about student attendance and behavior';
COMMENT ON TABLE public.student_qr_codes IS 'Stores QR code information for quick check-in';
COMMENT ON TABLE public.attendance_alerts IS 'Tracks attendance patterns and alerts for concerning patterns';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
