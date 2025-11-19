# Attendance & Check-In System - Database Design

## Overview

This document outlines the database schema for the Attendance & Check-In System. The system supports front desk check-in, teacher attendance marking, absence tracking, makeup classes, and comprehensive reporting.

## Entity Relationship Diagram

```
+------------------+       +------------------+       +------------------+
|    students      |------>|   attendance     |<------|  class_instances |
+------------------+       +------------------+       +------------------+
        |                          |                          |
        |                          |                          |
        v                          v                          v
+------------------+       +------------------+       +------------------+
|    absences      |       |  attendance_notes|       | schedule_classes |
+------------------+       +------------------+       +------------------+
        |
        v
+------------------+       +------------------+
| makeup_credits   |------>| makeup_bookings  |
+------------------+       +------------------+
```

## Tables

### 1. attendance

Tracks student check-ins and attendance for each class.

**Key Fields:**
- `id` - Primary key (UUID)
- `student_id` - Foreign key to students table
- `class_instance_id` - Foreign key to class_instances table
- `schedule_class_id` - Foreign key to schedule_classes table (specific occurrence)
- `attendance_date` - Date of the class
- `check_in_time` - When student checked in (timestamp)
- `check_out_time` - When student checked out (timestamp)
- `status` - Attendance status enum: 'present', 'absent', 'excused', 'tardy', 'left_early'
- `is_makeup` - Boolean indicating if this is a makeup class attendance
- `original_absence_id` - Foreign key to absences table (if makeup)
- `marked_by` - User ID who marked attendance
- `marked_at` - When attendance was marked
- `notes` - Optional notes about attendance
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

**Indexes:**
- `idx_attendance_student_id` on `student_id`
- `idx_attendance_class_instance_id` on `class_instance_id`
- `idx_attendance_date` on `attendance_date`
- `idx_attendance_status` on `status`
- `idx_attendance_student_date` on `(student_id, attendance_date)` (composite)

**Unique Constraint:**
- `unique_attendance_record` on `(student_id, class_instance_id, attendance_date)` - prevents duplicate attendance records

### 2. absences

Tracks planned and unplanned absences with reasons.

**Key Fields:**
- `id` - Primary key (UUID)
- `student_id` - Foreign key to students table
- `class_instance_id` - Foreign key to class_instances table
- `absence_date` - Date of absence
- `absence_type` - Enum: 'planned', 'unplanned'
- `reason` - Absence reason enum: 'illness', 'vacation', 'family_emergency', 'school_conflict', 'other'
- `reason_notes` - Additional details about absence
- `is_excused` - Boolean indicating if absence is excused
- `excused_by` - User ID who excused the absence
- `excused_at` - When absence was excused
- `makeup_credit_granted` - Boolean indicating if makeup credit was granted
- `makeup_credit_id` - Foreign key to makeup_credits table
- `reported_by` - User ID who reported absence (guardian/staff)
- `reported_at` - When absence was reported
- `notification_sent` - Boolean indicating if notification was sent to guardian
- `notification_sent_at` - When notification was sent
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

**Indexes:**
- `idx_absences_student_id` on `student_id`
- `idx_absences_class_instance_id` on `class_instance_id`
- `idx_absences_date` on `absence_date`
- `idx_absences_student_date` on `(student_id, absence_date)` (composite)

### 3. makeup_credits

Tracks available makeup class credits for students.

**Key Fields:**
- `id` - Primary key (UUID)
- `student_id` - Foreign key to students table
- `class_instance_id` - Foreign key to class_instances table (class credit is for)
- `absence_id` - Foreign key to absences table (absence that generated credit)
- `credits_available` - Number of credits available (usually 1)
- `credits_used` - Number of credits used
- `granted_date` - When credit was granted
- `expiration_date` - When credit expires
- `status` - Enum: 'active', 'used', 'expired', 'cancelled'
- `granted_by` - User ID who granted the credit
- `notes` - Optional notes about the credit
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

**Indexes:**
- `idx_makeup_credits_student_id` on `student_id`
- `idx_makeup_credits_status` on `status`
- `idx_makeup_credits_expiration` on `expiration_date`
- `idx_makeup_credits_student_status` on `(student_id, status)` (composite)

### 4. makeup_bookings

Tracks when makeup credits are used to attend different classes.

**Key Fields:**
- `id` - Primary key (UUID)
- `makeup_credit_id` - Foreign key to makeup_credits table
- `student_id` - Foreign key to students table
- `original_class_instance_id` - Foreign key to class_instances (original class)
- `makeup_class_instance_id` - Foreign key to class_instances (makeup class)
- `makeup_date` - Date of makeup class
- `status` - Enum: 'booked', 'attended', 'cancelled', 'no_show'
- `booked_by` - User ID who booked the makeup
- `booked_at` - When makeup was booked
- `cancelled_by` - User ID who cancelled (if cancelled)
- `cancelled_at` - When cancelled (if cancelled)
- `cancellation_reason` - Reason for cancellation
- `attendance_id` - Foreign key to attendance table (when attended)
- `notes` - Optional notes
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

**Indexes:**
- `idx_makeup_bookings_credit_id` on `makeup_credit_id`
- `idx_makeup_bookings_student_id` on `student_id`
- `idx_makeup_bookings_makeup_class` on `makeup_class_instance_id`
- `idx_makeup_bookings_date` on `makeup_date`
- `idx_makeup_bookings_status` on `status`

### 5. attendance_notes

Stores additional notes about student attendance and behavior.

**Key Fields:**
- `id` - Primary key (UUID)
- `attendance_id` - Foreign key to attendance table
- `student_id` - Foreign key to students table
- `note_type` - Enum: 'behavior', 'progress', 'concern', 'achievement', 'injury', 'general'
- `note_text` - The actual note content
- `is_private` - Boolean indicating if note is private (only visible to admin/staff)
- `visibility` - Enum: 'admin_only', 'staff_only', 'teachers', 'parents'
- `created_by` - User ID who created the note
- `created_at` - Note creation timestamp
- `updated_at` - Last update timestamp

**Indexes:**
- `idx_attendance_notes_attendance_id` on `attendance_id`
- `idx_attendance_notes_student_id` on `student_id`
- `idx_attendance_notes_type` on `note_type`

### 6. student_qr_codes

Stores QR code information for quick check-in.

**Key Fields:**
- `id` - Primary key (UUID)
- `student_id` - Foreign key to students table (UNIQUE)
- `qr_code_data` - The QR code data/token (UNIQUE)
- `qr_code_image_url` - URL to stored QR code image
- `generated_at` - When QR code was generated
- `last_used_at` - Last time QR code was used
- `is_active` - Boolean indicating if QR code is active
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

**Indexes:**
- `idx_student_qr_codes_student_id` on `student_id` (UNIQUE)
- `idx_student_qr_codes_qr_data` on `qr_code_data` (UNIQUE)

### 7. attendance_alerts

Tracks attendance patterns and alerts for concerning patterns.

**Key Fields:**
- `id` - Primary key (UUID)
- `student_id` - Foreign key to students table
- `alert_type` - Enum: 'consecutive_absences', 'low_attendance', 'excessive_tardiness', 'custom'
- `severity` - Enum: 'low', 'medium', 'high'
- `alert_message` - Description of the alert
- `alert_date` - Date alert was triggered
- `date_range_start` - Start of period being analyzed
- `date_range_end` - End of period being analyzed
- `metrics` - JSON field with calculated metrics (attendance %, absent count, etc.)
- `is_acknowledged` - Boolean indicating if alert has been acknowledged
- `acknowledged_by` - User ID who acknowledged alert
- `acknowledged_at` - When alert was acknowledged
- `action_taken` - Notes about action taken
- `is_resolved` - Boolean indicating if issue is resolved
- `resolved_at` - When issue was resolved
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

**Indexes:**
- `idx_attendance_alerts_student_id` on `student_id`
- `idx_attendance_alerts_type` on `alert_type`
- `idx_attendance_alerts_severity` on `severity`
- `idx_attendance_alerts_date` on `alert_date`
- `idx_attendance_alerts_unresolved` on `(is_resolved, alert_date)` (composite)

## Key Business Rules

### Attendance Status Logic

1. **Present**: Student checked in and attended full class
2. **Tardy**: Student checked in more than 10 minutes after class start
3. **Left Early**: Student checked out before class end time
4. **Absent**: Student did not attend (marked by teacher or automated)
5. **Excused**: Absence that has been excused by guardian or staff

### Makeup Credit Rules

1. Credits are granted for excused absences only (configurable)
2. Credits expire at the end of the schedule term
3. Students can only use makeup credits for classes at the same level or below
4. Makeup attendance must not exceed the makeup class capacity
5. Credits are use-it-or-lose-it (cannot be refunded)

### Notification Rules

1. Notify guardian if student marked absent (unexpected)
2. Notify guardian if student hasn't checked in 15 minutes after class start
3. Notify admin/staff if 3+ consecutive absences
4. Weekly attendance summary emails to guardians
5. Monthly attendance reports to admin

### Alert Triggers

1. **Consecutive Absences**: 3 or more absences in a row
2. **Low Attendance**: Below 75% attendance rate over 4 weeks
3. **Excessive Tardiness**: 4+ tardy arrivals in a month
4. **Custom Alerts**: Configured by admin based on specific criteria

## Database Views

### v_student_attendance_summary

Provides quick attendance statistics per student per class.

```sql
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
    (SUM(CASE WHEN a.status IN ('present', 'tardy') THEN 1 ELSE 0 END)::numeric /
     COUNT(*)::numeric * 100), 2
  ) as attendance_percentage
FROM students s
JOIN enrollments e ON e.student_id = s.id
JOIN class_instances ci ON ci.id = e.class_instance_id
LEFT JOIN attendance a ON a.student_id = s.id AND a.class_instance_id = ci.id
GROUP BY s.id, s.first_name, s.last_name, ci.id, ci.name;
```

### v_daily_attendance_roster

Shows expected students for each class on a given day.

```sql
CREATE OR REPLACE VIEW v_daily_attendance_roster AS
SELECT
  sc.id as schedule_class_id,
  sc.day_of_week,
  sc.start_time,
  sc.end_time,
  ci.id as class_instance_id,
  ci.name as class_name,
  s.id as student_id,
  s.first_name,
  s.last_name,
  s.photo_url,
  COALESCE(sp.allergies, '') as allergies,
  COALESCE(sp.medical_conditions, '') as medical_conditions,
  e.status as enrollment_status,
  a.status as attendance_status,
  a.check_in_time,
  a.check_out_time
FROM schedule_classes sc
JOIN class_instances ci ON ci.id = sc.class_instance_id
JOIN enrollments e ON e.class_instance_id = ci.id AND e.status = 'active'
JOIN students s ON s.id = e.student_id
LEFT JOIN student_profiles sp ON sp.student_id = s.id
LEFT JOIN attendance a ON a.student_id = s.id
  AND a.class_instance_id = ci.id
  AND a.schedule_class_id = sc.id
  AND a.attendance_date = CURRENT_DATE;
```

### v_makeup_credits_available

Shows available makeup credits per student.

```sql
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
  ab.absence_date,
  ab.reason
FROM students s
JOIN makeup_credits mc ON mc.student_id = s.id
JOIN class_instances ci ON ci.id = mc.class_instance_id
LEFT JOIN absences ab ON ab.id = mc.absence_id
WHERE mc.status = 'active'
  AND mc.expiration_date >= CURRENT_DATE
  AND mc.credits_available > mc.credits_used;
```

## Automatic Triggers

### 1. Auto-mark absent students

```sql
-- Function to auto-mark students absent if not checked in after class ends
CREATE OR REPLACE FUNCTION auto_mark_absent_students()
RETURNS void AS $$
BEGIN
  INSERT INTO attendance (
    student_id,
    class_instance_id,
    schedule_class_id,
    attendance_date,
    status,
    marked_by,
    marked_at
  )
  SELECT DISTINCT
    e.student_id,
    sc.class_instance_id,
    sc.id,
    CURRENT_DATE,
    'absent',
    NULL, -- System-generated
    NOW()
  FROM schedule_classes sc
  JOIN enrollments e ON e.class_instance_id = sc.class_instance_id
    AND e.status = 'active'
  WHERE sc.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)
    AND sc.end_time < CURRENT_TIME - INTERVAL '30 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM attendance a
      WHERE a.student_id = e.student_id
        AND a.class_instance_id = sc.class_instance_id
        AND a.attendance_date = CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql;
```

### 2. Generate makeup credits

```sql
-- Function to auto-generate makeup credits when absence is excused
CREATE OR REPLACE FUNCTION generate_makeup_credit()
RETURNS TRIGGER AS $$
DECLARE
  term_end_date date;
BEGIN
  IF NEW.is_excused = true AND NEW.makeup_credit_granted = false THEN
    -- Get term end date
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
    );

    -- Update absence to indicate credit was granted
    UPDATE absences
    SET makeup_credit_granted = true,
        makeup_credit_id = (
          SELECT id FROM makeup_credits
          WHERE absence_id = NEW.id
        )
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_makeup_credit
AFTER INSERT OR UPDATE ON absences
FOR EACH ROW
EXECUTE FUNCTION generate_makeup_credit();
```

### 3. Check for attendance alerts

```sql
-- Function to check for concerning attendance patterns
CREATE OR REPLACE FUNCTION check_attendance_alerts()
RETURNS void AS $$
BEGIN
  -- Check for 3+ consecutive absences
  INSERT INTO attendance_alerts (
    student_id,
    alert_type,
    severity,
    alert_message,
    alert_date,
    date_range_start,
    date_range_end,
    metrics
  )
  SELECT DISTINCT
    a1.student_id,
    'consecutive_absences',
    'high',
    'Student has 3 or more consecutive absences',
    CURRENT_DATE,
    MIN(a1.attendance_date),
    MAX(a1.attendance_date),
    jsonb_build_object(
      'consecutive_count', COUNT(*),
      'class_name', ci.name
    )
  FROM attendance a1
  JOIN attendance a2 ON a2.student_id = a1.student_id
    AND a2.class_instance_id = a1.class_instance_id
    AND a2.attendance_date = a1.attendance_date + 7
    AND a2.status IN ('absent', 'excused')
  JOIN attendance a3 ON a3.student_id = a1.student_id
    AND a3.class_instance_id = a1.class_instance_id
    AND a3.attendance_date = a2.attendance_date + 7
    AND a3.status IN ('absent', 'excused')
  JOIN class_instances ci ON ci.id = a1.class_instance_id
  WHERE a1.status IN ('absent', 'excused')
    AND a1.attendance_date >= CURRENT_DATE - INTERVAL '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM attendance_alerts aa
      WHERE aa.student_id = a1.student_id
        AND aa.alert_type = 'consecutive_absences'
        AND aa.alert_date = CURRENT_DATE
        AND aa.is_resolved = false
    )
  GROUP BY a1.student_id, a1.class_instance_id, ci.name
  HAVING COUNT(*) >= 3;
END;
$$ LANGUAGE plpgsql;
```

## Indexes for Performance

All indexes listed in individual table sections above, plus:

```sql
-- Composite indexes for common queries
CREATE INDEX idx_attendance_class_date ON attendance(class_instance_id, attendance_date);
CREATE INDEX idx_attendance_student_status ON attendance(student_id, status);
CREATE INDEX idx_absences_student_class ON absences(student_id, class_instance_id);
CREATE INDEX idx_makeup_bookings_student_date ON makeup_bookings(student_id, makeup_date);
```

## Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE makeup_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE makeup_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_alerts ENABLE ROW LEVEL SECURITY;

-- Policies for attendance table
CREATE POLICY "Admin and staff can view all attendance" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Teachers can view attendance for their classes" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN class_instances ci ON ci.teacher_id = p.id
      WHERE p.id = auth.uid()
      AND p.user_role = 'teacher'
      AND ci.id = attendance.class_instance_id
    )
  );

CREATE POLICY "Parents can view attendance for their students" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guardians g
      JOIN student_guardian_relationships sgr ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
      AND sgr.student_id = attendance.student_id
    )
  );

CREATE POLICY "Admin and staff can manage attendance" ON attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Teachers can manage attendance for their classes" ON attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN class_instances ci ON ci.teacher_id = p.id
      WHERE p.id = auth.uid()
      AND p.user_role = 'teacher'
      AND ci.id = attendance.class_instance_id
    )
  );

-- Similar policies for other tables...
```

## Future Enhancements

1. **Integration with biometric systems** - Fingerprint/face recognition
2. **Mobile check-in app** - Parents can check in students from parking lot
3. **Attendance gamification** - Rewards for consistent attendance
4. **Predictive analytics** - ML to predict at-risk students
5. **Integration with billing** - Auto-adjust billing based on attendance
6. **Video verification** - Store brief video clips at check-in for security
7. **Geofencing** - Only allow check-in within studio premises
8. **Group check-in** - Check in multiple siblings at once
