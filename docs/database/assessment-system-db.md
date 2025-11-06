# Student Progress & Assessment System - Database Documentation

## Overview
This document provides comprehensive documentation for the Student Progress & Assessment System database schema. The system enables teachers to evaluate students, track skill progression, generate progress reports, award achievement badges, and manage video-based progress tracking.

## Database Schema

### Core Assessment Tables

#### `evaluations`
Stores teacher evaluations of students for specific terms/periods.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| student_id | uuid | NOT NULL, FK → students(id) | Student being evaluated |
| teacher_id | uuid | NOT NULL, FK → teachers(id) | Teacher conducting evaluation |
| class_instance_id | uuid | NOT NULL, FK → class_instances(id) | Class this evaluation is for |
| schedule_id | uuid | FK → schedules(id) | Term/schedule period |
| overall_rating | integer | CHECK (overall_rating BETWEEN 1 AND 5) | Overall performance (1-5) |
| effort_rating | integer | CHECK (effort_rating BETWEEN 1 AND 5) | Student effort level (1-5) |
| attitude_rating | integer | CHECK (attitude_rating BETWEEN 1 AND 5) | Student attitude (1-5) |
| strengths | text | | Student's strengths |
| areas_for_improvement | text | | Areas needing improvement |
| comments | text | | General comments |
| recommended_next_level | uuid | FK → class_levels(id) | Suggested next level |
| status | varchar | NOT NULL, default 'draft' | Status (draft, submitted) |
| submitted_at | timestamp with timezone | | When evaluation was submitted |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

**Indexes:**
```sql
CREATE INDEX idx_evaluations_student_id ON evaluations(student_id);
CREATE INDEX idx_evaluations_teacher_id ON evaluations(teacher_id);
CREATE INDEX idx_evaluations_class_instance_id ON evaluations(class_instance_id);
CREATE INDEX idx_evaluations_schedule_id ON evaluations(schedule_id);
CREATE INDEX idx_evaluations_status ON evaluations(status);
```

---

#### `evaluation_skills`
Individual skill ratings within an evaluation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| evaluation_id | uuid | NOT NULL, FK → evaluations(id) ON DELETE CASCADE | Parent evaluation |
| skill_name | varchar | NOT NULL | Name of the skill |
| skill_category | varchar | | Category (technique, musicality, performance) |
| rating | varchar | NOT NULL | Rating (needs_work, proficient, excellent) |
| notes | text | | Additional notes on this skill |
| created_at | timestamp with timezone | default now() | Creation timestamp |

**Indexes:**
```sql
CREATE INDEX idx_evaluation_skills_evaluation_id ON evaluation_skills(evaluation_id);
```

---

#### `skills`
Library of skills organized by dance style and level.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| name | varchar | NOT NULL | Skill name |
| description | text | | Detailed description |
| dance_style_id | uuid | FK → dance_styles(id) | Associated dance style |
| class_level_id | uuid | FK → class_levels(id) | Associated skill level |
| category | varchar | NOT NULL | Category (technique, musicality, performance, strength, flexibility) |
| required_for_advancement | boolean | default false | Required to advance to next level |
| display_order | integer | default 0 | Display order within category |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

**Indexes:**
```sql
CREATE INDEX idx_skills_dance_style_id ON skills(dance_style_id);
CREATE INDEX idx_skills_class_level_id ON skills(class_level_id);
CREATE INDEX idx_skills_category ON skills(category);
```

---

#### `student_skills`
Tracks student mastery of individual skills.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| student_id | uuid | NOT NULL, FK → students(id) | Student |
| skill_id | uuid | NOT NULL, FK → skills(id) | Skill being tracked |
| class_instance_id | uuid | FK → class_instances(id) | Class where skill is being learned |
| mastery_status | varchar | NOT NULL, default 'not_started' | Status (not_started, in_progress, mastered) |
| date_started | date | | When student started working on skill |
| date_mastered | date | | When student mastered the skill |
| confirmed_by_teacher_id | uuid | FK → teachers(id) | Teacher who confirmed mastery |
| video_proof_id | uuid | FK → progress_videos(id) | Optional video proof |
| notes | text | | Progress notes |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

**Indexes:**
```sql
CREATE INDEX idx_student_skills_student_id ON student_skills(student_id);
CREATE INDEX idx_student_skills_skill_id ON student_skills(skill_id);
CREATE INDEX idx_student_skills_class_instance_id ON student_skills(class_instance_id);
CREATE INDEX idx_student_skills_mastery_status ON student_skills(mastery_status);
CREATE UNIQUE INDEX idx_student_skills_unique ON student_skills(student_id, skill_id, class_instance_id);
```

---

### Achievement System Tables

#### `achievements`
Defines available badges and certificates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| name | varchar | NOT NULL | Achievement name |
| description | text | NOT NULL | Description of achievement |
| achievement_type | varchar | NOT NULL | Type (attendance, skill, performance, milestone, custom) |
| badge_icon | varchar | | Icon name or path |
| badge_color | varchar | | Hex color code |
| criteria | jsonb | NOT NULL | Flexible criteria definition |
| is_active | boolean | default true | Whether achievement is active |
| auto_award | boolean | default false | Automatically award when criteria met |
| display_order | integer | default 0 | Display order in showcase |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

**Example criteria JSON:**
```json
{
  "type": "attendance",
  "threshold": 100,
  "period": "all_time"
}
```

```json
{
  "type": "skill_mastery",
  "skills_required": 10,
  "level_id": "uuid"
}
```

```json
{
  "type": "recital",
  "recitals_performed": 1
}
```

**Indexes:**
```sql
CREATE INDEX idx_achievements_type ON achievements(achievement_type);
CREATE INDEX idx_achievements_active ON achievements(is_active);
```

---

#### `student_achievements`
Tracks achievements earned by students.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| student_id | uuid | NOT NULL, FK → students(id) | Student who earned achievement |
| achievement_id | uuid | NOT NULL, FK → achievements(id) | Achievement earned |
| date_earned | date | NOT NULL, default CURRENT_DATE | When achievement was earned |
| awarded_by_teacher_id | uuid | FK → teachers(id) | Teacher who awarded (if manual) |
| notes | text | | Additional notes |
| is_featured | boolean | default false | Featured in student profile |
| created_at | timestamp with timezone | default now() | Creation timestamp |

**Indexes:**
```sql
CREATE INDEX idx_student_achievements_student_id ON student_achievements(student_id);
CREATE INDEX idx_student_achievements_achievement_id ON student_achievements(achievement_id);
CREATE UNIQUE INDEX idx_student_achievements_unique ON student_achievements(student_id, achievement_id);
```

---

### Progress Report Tables

#### `progress_reports`
Generated progress reports for students.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| student_id | uuid | NOT NULL, FK → students(id) | Student |
| schedule_id | uuid | FK → schedules(id) | Term/schedule period |
| generated_at | timestamp with timezone | NOT NULL, default now() | When report was generated |
| generated_by_teacher_id | uuid | FK → teachers(id) | Teacher who generated report |
| evaluation_id | uuid | FK → evaluations(id) | Primary evaluation included |
| attendance_rate | decimal(5,2) | | Attendance percentage |
| classes_attended | integer | | Number of classes attended |
| total_classes | integer | | Total classes in period |
| skills_mastered_count | integer | | Number of skills mastered |
| total_skills_count | integer | | Total skills for level |
| pdf_url | text | | URL to generated PDF |
| parent_notified_at | timestamp with timezone | | When parent was notified |
| parent_viewed_at | timestamp with timezone | | When parent first viewed |
| status | varchar | NOT NULL, default 'draft' | Status (draft, published, archived) |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

**Indexes:**
```sql
CREATE INDEX idx_progress_reports_student_id ON progress_reports(student_id);
CREATE INDEX idx_progress_reports_schedule_id ON progress_reports(schedule_id);
CREATE INDEX idx_progress_reports_status ON progress_reports(status);
```

---

### Video Progress Tracking Tables

#### `progress_videos`
Videos uploaded for skill progress tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| student_id | uuid | NOT NULL, FK → students(id) | Student in video |
| teacher_id | uuid | NOT NULL, FK → teachers(id) | Teacher who uploaded |
| skill_id | uuid | FK → skills(id) | Skill demonstrated |
| class_instance_id | uuid | FK → class_instances(id) | Associated class |
| title | varchar | NOT NULL | Video title |
| description | text | | Video description |
| file_path | text | NOT NULL | Supabase Storage path |
| file_size_bytes | bigint | | File size |
| mime_type | varchar | | Video MIME type |
| duration_seconds | integer | | Video duration |
| thumbnail_path | text | | Thumbnail image path |
| recorded_date | date | | When video was recorded |
| uploaded_at | timestamp with timezone | NOT NULL, default now() | When video was uploaded |
| visibility | varchar | NOT NULL, default 'private' | Visibility (private, student_parent, public) |
| annotations | jsonb | | Teacher annotations/feedback |
| is_archived | boolean | default false | Archived status |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

**Example annotations JSON:**
```json
{
  "timestamp": 15.5,
  "comment": "Great extension here!",
  "type": "positive"
}
```

**Indexes:**
```sql
CREATE INDEX idx_progress_videos_student_id ON progress_videos(student_id);
CREATE INDEX idx_progress_videos_teacher_id ON progress_videos(teacher_id);
CREATE INDEX idx_progress_videos_skill_id ON progress_videos(skill_id);
CREATE INDEX idx_progress_videos_class_instance_id ON progress_videos(class_instance_id);
CREATE INDEX idx_progress_videos_visibility ON progress_videos(visibility);
CREATE INDEX idx_progress_videos_archived ON progress_videos(is_archived);
```

---

## Key Relationships

### Evaluation Structure
- A `student` can have multiple `evaluations` (one per class per term)
- A `teacher` conducts multiple `evaluations`
- Each `evaluation` contains multiple `evaluation_skills`
- An `evaluation` is associated with a `class_instance` and `schedule` (term)

### Skill Progression Structure
- A `skill` is defined in the `skills` library
- Each `skill` is associated with a `dance_style` and `class_level`
- Student progress on skills is tracked in `student_skills`
- `student_skills` links students, skills, and optionally video proof

### Achievement Structure
- `achievements` defines available badges/certificates
- `student_achievements` tracks which students earned which achievements
- Achievements can be auto-awarded based on criteria or manually awarded by teachers

### Progress Report Structure
- A `progress_report` aggregates data for a student for a specific term
- Reports include evaluation data, attendance, and skill mastery statistics
- Reports are generated as PDFs and stored in Supabase Storage

### Video Progress Structure
- `progress_videos` stores video files in Supabase Storage
- Videos are linked to students, teachers, skills, and classes
- Privacy controls restrict access to student, parent, and teacher only
- Videos can have teacher annotations stored as JSONB

---

## Automatic Timestamps

Create the trigger function if it doesn't exist:

```sql
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Triggers are implemented on all tables with `updated_at` columns:

```sql
-- Evaluations
CREATE TRIGGER update_evaluations_updated_at
BEFORE UPDATE ON evaluations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Skills
CREATE TRIGGER update_skills_updated_at
BEFORE UPDATE ON skills
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Student Skills
CREATE TRIGGER update_student_skills_updated_at
BEFORE UPDATE ON student_skills
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Achievements
CREATE TRIGGER update_achievements_updated_at
BEFORE UPDATE ON achievements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Progress Reports
CREATE TRIGGER update_progress_reports_updated_at
BEFORE UPDATE ON progress_reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Progress Videos
CREATE TRIGGER update_progress_videos_updated_at
BEFORE UPDATE ON progress_videos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## SQL Migration Scripts

### 1. Create evaluations Table

```sql
-- Create evaluations table
CREATE TABLE IF NOT EXISTS public.evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    class_instance_id UUID NOT NULL REFERENCES public.class_instances(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.schedules(id),
    overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
    effort_rating INTEGER CHECK (effort_rating BETWEEN 1 AND 5),
    attitude_rating INTEGER CHECK (attitude_rating BETWEEN 1 AND 5),
    strengths TEXT,
    areas_for_improvement TEXT,
    comments TEXT,
    recommended_next_level UUID REFERENCES public.class_levels(id),
    status VARCHAR NOT NULL DEFAULT 'draft',
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_evaluations_student_id ON public.evaluations(student_id);
CREATE INDEX idx_evaluations_teacher_id ON public.evaluations(teacher_id);
CREATE INDEX idx_evaluations_class_instance_id ON public.evaluations(class_instance_id);
CREATE INDEX idx_evaluations_schedule_id ON public.evaluations(schedule_id);
CREATE INDEX idx_evaluations_status ON public.evaluations(status);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_evaluations_updated_at ON public.evaluations;
CREATE TRIGGER update_evaluations_updated_at
BEFORE UPDATE ON public.evaluations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluations TO authenticated;
```

### 2. Create evaluation_skills Table

```sql
-- Create evaluation_skills table
CREATE TABLE IF NOT EXISTS public.evaluation_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
    skill_name VARCHAR NOT NULL,
    skill_category VARCHAR,
    rating VARCHAR NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_evaluation_skills_evaluation_id ON public.evaluation_skills(evaluation_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation_skills TO authenticated;
```

### 3. Create skills Table

```sql
-- Create skills table
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    description TEXT,
    dance_style_id UUID REFERENCES public.dance_styles(id) ON DELETE CASCADE,
    class_level_id UUID REFERENCES public.class_levels(id) ON DELETE CASCADE,
    category VARCHAR NOT NULL,
    required_for_advancement BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_skills_dance_style_id ON public.skills(dance_style_id);
CREATE INDEX idx_skills_class_level_id ON public.skills(class_level_id);
CREATE INDEX idx_skills_category ON public.skills(category);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_skills_updated_at ON public.skills;
CREATE TRIGGER update_skills_updated_at
BEFORE UPDATE ON public.skills
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT ON public.skills TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.skills TO authenticated; -- Restrict to admin in RLS
```

### 4. Create student_skills Table

```sql
-- Create student_skills table
CREATE TABLE IF NOT EXISTS public.student_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    class_instance_id UUID REFERENCES public.class_instances(id) ON DELETE SET NULL,
    mastery_status VARCHAR NOT NULL DEFAULT 'not_started',
    date_started DATE,
    date_mastered DATE,
    confirmed_by_teacher_id UUID REFERENCES public.teachers(id),
    video_proof_id UUID REFERENCES public.progress_videos(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_student_skills_student_id ON public.student_skills(student_id);
CREATE INDEX idx_student_skills_skill_id ON public.student_skills(skill_id);
CREATE INDEX idx_student_skills_class_instance_id ON public.student_skills(class_instance_id);
CREATE INDEX idx_student_skills_mastery_status ON public.student_skills(mastery_status);
CREATE UNIQUE INDEX idx_student_skills_unique ON public.student_skills(student_id, skill_id, class_instance_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_student_skills_updated_at ON public.student_skills;
CREATE TRIGGER update_student_skills_updated_at
BEFORE UPDATE ON public.student_skills
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_skills TO authenticated;
```

### 5. Create achievements Table

```sql
-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    description TEXT NOT NULL,
    achievement_type VARCHAR NOT NULL,
    badge_icon VARCHAR,
    badge_color VARCHAR,
    criteria JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    auto_award BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_achievements_type ON public.achievements(achievement_type);
CREATE INDEX idx_achievements_active ON public.achievements(is_active);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_achievements_updated_at ON public.achievements;
CREATE TRIGGER update_achievements_updated_at
BEFORE UPDATE ON public.achievements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT ON public.achievements TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.achievements TO authenticated; -- Restrict to admin in RLS
```

### 6. Create student_achievements Table

```sql
-- Create student_achievements table
CREATE TABLE IF NOT EXISTS public.student_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    date_earned DATE NOT NULL DEFAULT CURRENT_DATE,
    awarded_by_teacher_id UUID REFERENCES public.teachers(id),
    notes TEXT,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_student_achievements_student_id ON public.student_achievements(student_id);
CREATE INDEX idx_student_achievements_achievement_id ON public.student_achievements(achievement_id);
CREATE UNIQUE INDEX idx_student_achievements_unique ON public.student_achievements(student_id, achievement_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_achievements TO authenticated;
```

### 7. Create progress_reports Table

```sql
-- Create progress_reports table
CREATE TABLE IF NOT EXISTS public.progress_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.schedules(id),
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    generated_by_teacher_id UUID REFERENCES public.teachers(id),
    evaluation_id UUID REFERENCES public.evaluations(id),
    attendance_rate DECIMAL(5,2),
    classes_attended INTEGER,
    total_classes INTEGER,
    skills_mastered_count INTEGER,
    total_skills_count INTEGER,
    pdf_url TEXT,
    parent_notified_at TIMESTAMP WITH TIME ZONE,
    parent_viewed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_progress_reports_student_id ON public.progress_reports(student_id);
CREATE INDEX idx_progress_reports_schedule_id ON public.progress_reports(schedule_id);
CREATE INDEX idx_progress_reports_status ON public.progress_reports(status);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_progress_reports_updated_at ON public.progress_reports;
CREATE TRIGGER update_progress_reports_updated_at
BEFORE UPDATE ON public.progress_reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_reports TO authenticated;
```

### 8. Create progress_videos Table

```sql
-- Create progress_videos table
CREATE TABLE IF NOT EXISTS public.progress_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id),
    skill_id UUID REFERENCES public.skills(id),
    class_instance_id UUID REFERENCES public.class_instances(id),
    title VARCHAR NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR,
    duration_seconds INTEGER,
    thumbnail_path TEXT,
    recorded_date DATE,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    visibility VARCHAR NOT NULL DEFAULT 'private',
    annotations JSONB,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_progress_videos_student_id ON public.progress_videos(student_id);
CREATE INDEX idx_progress_videos_teacher_id ON public.progress_videos(teacher_id);
CREATE INDEX idx_progress_videos_skill_id ON public.progress_videos(skill_id);
CREATE INDEX idx_progress_videos_class_instance_id ON public.progress_videos(class_instance_id);
CREATE INDEX idx_progress_videos_visibility ON public.progress_videos(visibility);
CREATE INDEX idx_progress_videos_archived ON public.progress_videos(is_archived);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_progress_videos_updated_at ON public.progress_videos;
CREATE TRIGGER update_progress_videos_updated_at
BEFORE UPDATE ON public.progress_videos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_videos TO authenticated;
```

---

## Row Level Security (RLS) Policies

### Evaluations RLS

```sql
-- Enable RLS
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own evaluations
CREATE POLICY "Teachers can view own evaluations"
ON public.evaluations FOR SELECT
USING (
  teacher_id IN (
    SELECT id FROM public.teachers WHERE id = auth.uid()
  )
);

-- Admins and staff can view all evaluations
CREATE POLICY "Admin and staff can view all evaluations"
ON public.evaluations FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE user_role IN ('admin', 'staff')
  )
);

-- Parents can view their children's evaluations
CREATE POLICY "Parents can view their children's evaluations"
ON public.evaluations FOR SELECT
USING (
  student_id IN (
    SELECT student_id FROM public.guardians WHERE guardian_id = auth.uid()
  )
);

-- Teachers can insert/update their own evaluations
CREATE POLICY "Teachers can manage own evaluations"
ON public.evaluations FOR ALL
USING (
  teacher_id IN (
    SELECT id FROM public.teachers WHERE id = auth.uid()
  )
);
```

### Progress Videos RLS

```sql
-- Enable RLS
ALTER TABLE public.progress_videos ENABLE ROW LEVEL SECURITY;

-- Teachers can view videos they uploaded
CREATE POLICY "Teachers can view own videos"
ON public.progress_videos FOR SELECT
USING (teacher_id = auth.uid());

-- Parents can view their children's videos
CREATE POLICY "Parents can view their children's videos"
ON public.progress_videos FOR SELECT
USING (
  student_id IN (
    SELECT student_id FROM public.guardians WHERE guardian_id = auth.uid()
  )
);

-- Students can view their own videos (if student role has access)
CREATE POLICY "Students can view own videos"
ON public.progress_videos FOR SELECT
USING (student_id = auth.uid());

-- Teachers can upload videos
CREATE POLICY "Teachers can upload videos"
ON public.progress_videos FOR INSERT
WITH CHECK (teacher_id = auth.uid());

-- Teachers can update their own videos
CREATE POLICY "Teachers can update own videos"
ON public.progress_videos FOR UPDATE
USING (teacher_id = auth.uid());
```

---

## Supabase Storage Buckets

### progress-videos Bucket

```sql
-- Create bucket for progress videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-videos', 'progress-videos', false);

-- RLS policies for progress-videos bucket
-- Teachers can upload videos
CREATE POLICY "Teachers can upload progress videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'progress-videos' AND
  auth.uid() IN (SELECT id FROM public.teachers)
);

-- Teachers, parents, and students can view videos based on ownership
CREATE POLICY "Authorized users can view progress videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'progress-videos' AND (
    -- Teacher who uploaded
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Parent of student
    (storage.foldername(name))[2]::uuid IN (
      SELECT student_id FROM public.guardians WHERE guardian_id = auth.uid()
    ) OR
    -- The student themselves
    (storage.foldername(name))[2]::uuid = auth.uid()
  )
);
```

---

## Seed Data: Default Achievements

```sql
-- Insert default achievements
INSERT INTO public.achievements (name, description, achievement_type, badge_icon, badge_color, criteria, auto_award) VALUES
('First Recital', 'Performed in your first recital!', 'performance', 'pi-star', '#FFD700', '{"type": "recital", "recitals_performed": 1}', true),
('100 Classes', 'Attended 100 classes!', 'attendance', 'pi-check-circle', '#4CAF50', '{"type": "attendance", "threshold": 100, "period": "all_time"}', true),
('Perfect Attendance', 'Perfect attendance for one term!', 'attendance', 'pi-calendar-check', '#2196F3', '{"type": "attendance", "threshold": 100, "period": "term"}', true),
('Skill Master', 'Mastered all skills for your level!', 'skill', 'pi-graduation-cap', '#9C27B0', '{"type": "skill_mastery", "all_skills_for_level": true}', true),
('Rising Star', 'Demonstrated exceptional progress!', 'milestone', 'pi-sparkles', '#FF9800', '{"type": "manual", "teacher_awarded": true}', false),
('Team Player', 'Outstanding collaboration and support of classmates!', 'custom', 'pi-users', '#00BCD4', '{"type": "manual", "teacher_awarded": true}', false),
('5 Years Dancing', 'Celebrated 5 years at our studio!', 'milestone', 'pi-heart', '#E91E63', '{"type": "tenure", "years": 5}', true);
```

---

## Seed Data: Common Skills

```sql
-- Insert common ballet skills (replace UUIDs with actual IDs from your database)
-- This is an example - you'll need to customize based on your dance styles and levels

-- Ballet Beginner Skills
INSERT INTO public.skills (name, description, category, dance_style_id, class_level_id, required_for_advancement, display_order) VALUES
('First Position', 'Feet turned out, heels together', 'technique', '[ballet-style-uuid]', '[beginner-level-uuid]', true, 1),
('Second Position', 'Feet turned out, heels apart', 'technique', '[ballet-style-uuid]', '[beginner-level-uuid]', true, 2),
('Plié', 'Bending of the knees', 'technique', '[ballet-style-uuid]', '[beginner-level-uuid]', true, 3),
('Tendu', 'Stretched pointed foot', 'technique', '[ballet-style-uuid]', '[beginner-level-uuid]', true, 4),
('Port de Bras', 'Carriage of the arms', 'technique', '[ballet-style-uuid]', '[beginner-level-uuid]', true, 5),
('Balance', 'Maintaining stability', 'strength', '[ballet-style-uuid]', '[beginner-level-uuid]', false, 6),
('Musicality', 'Dancing to the beat', 'musicality', '[ballet-style-uuid]', '[beginner-level-uuid]', true, 7);

-- Jazz Beginner Skills
INSERT INTO public.skills (name, description, category, dance_style_id, class_level_id, required_for_advancement, display_order) VALUES
('Jazz Walk', 'Stylized walking with hip isolation', 'technique', '[jazz-style-uuid]', '[beginner-level-uuid]', true, 1),
('Isolations', 'Moving individual body parts', 'technique', '[jazz-style-uuid]', '[beginner-level-uuid]', true, 2),
('Chassé', 'Sliding step', 'technique', '[jazz-style-uuid]', '[beginner-level-uuid]', true, 3),
('Pirouette', 'Turn on one leg', 'technique', '[jazz-style-uuid]', '[beginner-level-uuid]', false, 4),
('Stage Presence', 'Confidence and expression', 'performance', '[jazz-style-uuid]', '[beginner-level-uuid]', true, 5);
```

---

## Future Enhancements

Potential future enhancements include:

1. **Assessment Templates**: Pre-defined evaluation forms per dance style/level
2. **Video Comparison Tool**: Side-by-side video comparison UI
3. **Parent Feedback**: Allow parents to provide feedback on progress reports
4. **Goal Setting**: Students and teachers can set specific goals
5. **Progress Analytics**: Visual charts and trends over time
6. **Skill Recommendations**: AI-suggested skills to work on next
7. **Certificate Templates**: Customizable certificate designs
8. **Social Sharing**: Share achievements on social media
9. **Video Compression**: Automatic video compression to save storage
10. **External Video Hosting**: Integration with Vimeo or YouTube for larger videos
