-- Lesson Planning Feature Database Schema
-- Story 5.3.2: Lesson Planning

-- ============================================
-- Learning Objectives / Skills
-- ============================================
-- Skills that students should learn (tied to class definitions/levels)
CREATE TABLE learning_objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_definition_id UUID REFERENCES class_definitions(id) ON DELETE CASCADE,
  dance_style_id UUID REFERENCES dance_styles(id) ON DELETE SET NULL,
  class_level_id UUID REFERENCES class_levels(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- e.g., 'technique', 'choreography', 'musicality', 'performance'
  skill_level VARCHAR(50), -- e.g., 'beginner', 'intermediate', 'advanced'
  sequence_order INTEGER DEFAULT 0, -- Order within curriculum
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_learning_objectives_class_def ON learning_objectives(class_definition_id);
CREATE INDEX idx_learning_objectives_style ON learning_objectives(dance_style_id);
CREATE INDEX idx_learning_objectives_level ON learning_objectives(class_level_id);

-- ============================================
-- Lesson Plan Templates
-- ============================================
-- Reusable lesson plan templates that teachers can use
CREATE TABLE lesson_plan_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  dance_style_id UUID REFERENCES dance_styles(id) ON DELETE SET NULL,
  class_level_id UUID REFERENCES class_levels(id) ON DELETE SET NULL,
  duration INTEGER, -- Duration in minutes
  content JSONB, -- TipTap JSON content for lesson plan
  objectives JSONB, -- Array of learning objective IDs or custom objectives
  materials_needed TEXT,
  warm_up TEXT,
  main_activity TEXT,
  cool_down TEXT,
  notes TEXT,
  is_public BOOLEAN DEFAULT false, -- Can other teachers use this template?
  use_count INTEGER DEFAULT 0, -- Track how often template is used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_lesson_templates_teacher ON lesson_plan_templates(teacher_id);
CREATE INDEX idx_lesson_templates_style ON lesson_plan_templates(dance_style_id);
CREATE INDEX idx_lesson_templates_level ON lesson_plan_templates(class_level_id);
CREATE INDEX idx_lesson_templates_public ON lesson_plan_templates(is_public);

-- ============================================
-- Lesson Plans
-- ============================================
-- Actual lesson plans for specific class instances
CREATE TABLE lesson_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_instance_id UUID REFERENCES class_instances(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  template_id UUID REFERENCES lesson_plan_templates(id) ON DELETE SET NULL,
  lesson_date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration INTEGER, -- Duration in minutes
  content JSONB, -- TipTap JSON content for lesson plan
  objectives JSONB, -- Array of learning objective IDs linked to this lesson
  materials_needed TEXT,
  warm_up TEXT,
  main_activity TEXT,
  cool_down TEXT,
  homework TEXT, -- Practice assignments for students
  notes TEXT, -- Teacher's private notes
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'planned', 'in_progress', 'completed', 'cancelled'
  is_archived BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_lesson_plans_class_instance ON lesson_plans(class_instance_id);
CREATE INDEX idx_lesson_plans_teacher ON lesson_plans(teacher_id);
CREATE INDEX idx_lesson_plans_template ON lesson_plans(template_id);
CREATE INDEX idx_lesson_plans_date ON lesson_plans(lesson_date);
CREATE INDEX idx_lesson_plans_status ON lesson_plans(status);
CREATE INDEX idx_lesson_plans_archived ON lesson_plans(is_archived);

-- ============================================
-- Lesson Plan Objectives (Junction Table)
-- ============================================
-- Links lesson plans to specific learning objectives
CREATE TABLE lesson_plan_objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_plan_id UUID REFERENCES lesson_plans(id) ON DELETE CASCADE,
  learning_objective_id UUID REFERENCES learning_objectives(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- Is this a primary objective for this lesson?
  notes TEXT, -- Specific notes about this objective for this lesson
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_lesson_plan_objectives_lesson ON lesson_plan_objectives(lesson_plan_id);
CREATE INDEX idx_lesson_plan_objectives_objective ON lesson_plan_objectives(learning_objective_id);

-- ============================================
-- Lesson Plan Sharing
-- ============================================
-- Share lesson plans with assistant teachers or other teachers
CREATE TABLE lesson_plan_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_plan_id UUID REFERENCES lesson_plans(id) ON DELETE CASCADE,
  shared_with_teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  shared_by_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  permission_level VARCHAR(50) DEFAULT 'view', -- 'view', 'edit', 'copy'
  message TEXT, -- Optional message from sharer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_lesson_plan_shares_lesson ON lesson_plan_shares(lesson_plan_id);
CREATE INDEX idx_lesson_plan_shares_shared_with ON lesson_plan_shares(shared_with_teacher_id);
CREATE INDEX idx_lesson_plan_shares_shared_by ON lesson_plan_shares(shared_by_teacher_id);

-- ============================================
-- Student Progress Tracking
-- ============================================
-- Track individual student progress on learning objectives
CREATE TABLE student_objective_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  learning_objective_id UUID REFERENCES learning_objectives(id) ON DELETE CASCADE,
  lesson_plan_id UUID REFERENCES lesson_plans(id) ON DELETE CASCADE,
  class_instance_id UUID REFERENCES class_instances(id) ON DELETE CASCADE,
  progress_level VARCHAR(50) DEFAULT 'not_started', -- 'not_started', 'introduced', 'practicing', 'proficient', 'mastered'
  assessment_date DATE,
  notes TEXT,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_student_progress_student ON student_objective_progress(student_id);
CREATE INDEX idx_student_progress_objective ON student_objective_progress(learning_objective_id);
CREATE INDEX idx_student_progress_lesson ON student_objective_progress(lesson_plan_id);
CREATE INDEX idx_student_progress_class ON student_objective_progress(class_instance_id);

-- ============================================
-- Lesson Plan Attachments
-- ============================================
-- Store references to files (music, videos, images) attached to lesson plans
CREATE TABLE lesson_plan_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_plan_id UUID REFERENCES lesson_plans(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_type VARCHAR(50), -- 'music', 'video', 'image', 'document'
  file_size INTEGER, -- Size in bytes
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_lesson_attachments_lesson ON lesson_plan_attachments(lesson_plan_id);

-- ============================================
-- Curriculum Progression Tracking
-- ============================================
-- Track overall curriculum coverage for a class instance
CREATE TABLE class_curriculum_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_instance_id UUID REFERENCES class_instances(id) ON DELETE CASCADE,
  learning_objective_id UUID REFERENCES learning_objectives(id) ON DELETE CASCADE,
  first_introduced_lesson_id UUID REFERENCES lesson_plans(id) ON DELETE SET NULL,
  last_practiced_lesson_id UUID REFERENCES lesson_plans(id) ON DELETE SET NULL,
  times_practiced INTEGER DEFAULT 0,
  average_student_progress VARCHAR(50), -- Calculated average of student progress
  status VARCHAR(50) DEFAULT 'not_covered', -- 'not_covered', 'introduced', 'in_progress', 'mastered'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_curriculum_progress_class ON class_curriculum_progress(class_instance_id);
CREATE INDEX idx_curriculum_progress_objective ON class_curriculum_progress(learning_objective_id);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
-- Enable RLS on all tables
ALTER TABLE learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plan_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plan_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_objective_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plan_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_curriculum_progress ENABLE ROW LEVEL SECURITY;

-- Learning Objectives: Admins can manage all, teachers can view all
CREATE POLICY "Admins can manage all learning objectives"
  ON learning_objectives FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Teachers can view learning objectives"
  ON learning_objectives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('teacher', 'admin', 'staff')
    )
  );

-- Lesson Plan Templates: Teachers own their templates, can view public ones
CREATE POLICY "Teachers can manage their own templates"
  ON lesson_plan_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teachers t
      JOIN profiles p ON p.id = t.profile_id
      WHERE t.id = lesson_plan_templates.teacher_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view public templates"
  ON lesson_plan_templates FOR SELECT
  USING (
    lesson_plan_templates.is_public = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('teacher', 'admin', 'staff')
    )
  );

CREATE POLICY "Admins can manage all templates"
  ON lesson_plan_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Lesson Plans: Teachers can manage their own plans, view shared plans
CREATE POLICY "Teachers can manage their own lesson plans"
  ON lesson_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teachers t
      JOIN profiles p ON p.id = t.profile_id
      WHERE t.id = lesson_plans.teacher_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view shared lesson plans"
  ON lesson_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lesson_plan_shares lps
      JOIN teachers t ON t.id = lps.shared_with_teacher_id
      JOIN profiles p ON p.id = t.profile_id
      WHERE lps.lesson_plan_id = lesson_plans.id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all lesson plans"
  ON lesson_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Similar policies for other tables...
-- (Additional RLS policies can be added as needed)

-- ============================================
-- Functions and Triggers
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_lesson_planning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_learning_objectives_updated_at
  BEFORE UPDATE ON learning_objectives
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_planning_updated_at();

CREATE TRIGGER update_lesson_plan_templates_updated_at
  BEFORE UPDATE ON lesson_plan_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_planning_updated_at();

CREATE TRIGGER update_lesson_plans_updated_at
  BEFORE UPDATE ON lesson_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_planning_updated_at();

CREATE TRIGGER update_student_progress_updated_at
  BEFORE UPDATE ON student_objective_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_planning_updated_at();

CREATE TRIGGER update_curriculum_progress_updated_at
  BEFORE UPDATE ON class_curriculum_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_planning_updated_at();

-- Increment template use count when lesson plan is created from template
CREATE OR REPLACE FUNCTION increment_template_use_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE lesson_plan_templates
    SET use_count = use_count + 1
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_template_count_on_lesson_create
  AFTER INSERT ON lesson_plans
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_use_count();

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================

-- Sample learning objectives
-- INSERT INTO learning_objectives (class_definition_id, title, description, category, skill_level) VALUES
-- (null, 'Master Basic Ballet Positions', 'Learn and execute first through fifth positions with proper form', 'technique', 'beginner'),
-- (null, 'Develop Musicality', 'Ability to count music and move in time with rhythm', 'musicality', 'beginner'),
-- (null, 'Perform Basic Jazz Square', 'Execute jazz square combination with confidence', 'choreography', 'beginner');
