-- Migration: Enhance Recital Tasks System
-- Story 2.1.2: Enhanced Recital Checklist System
-- Adds task templates, dependencies, assignments, and file attachments

-- Enhance existing recital_tasks table
ALTER TABLE recital_tasks
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES recital_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_recital_tasks_assigned_to ON recital_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_recital_tasks_parent_task ON recital_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_recital_tasks_due_date ON recital_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_recital_tasks_status ON recital_tasks(status);

-- Create task templates table
CREATE TABLE IF NOT EXISTS recital_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tasks JSONB NOT NULL, -- Array of template tasks with structure
  timeline_offset_days INTEGER NOT NULL, -- e.g., -42 for "6 weeks before show"
  category VARCHAR(100), -- e.g., 'pre_production', 'week_of', 'day_of'
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create task attachments table
CREATE TABLE IF NOT EXISTS recital_task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES recital_tasks(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON recital_task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_category ON recital_task_templates(category);

-- Insert default task templates
INSERT INTO recital_task_templates (name, description, timeline_offset_days, category, sort_order, tasks) VALUES
  (
    '6 Weeks Before Show',
    'Critical tasks to complete 6 weeks before the recital',
    -42,
    'pre_production',
    1,
    '[
      {"title": "Finalize recital theme and title", "description": "Confirm creative direction with staff", "category": "planning"},
      {"title": "Book venue and confirm show dates", "description": "Sign contract and pay deposit", "category": "venue"},
      {"title": "Create master class performance list", "description": "List all classes and tentative performance pieces", "category": "programming"},
      {"title": "Order programs and tickets", "description": "Submit print order to vendor", "category": "materials"},
      {"title": "Send parent information packet", "description": "Email details about recital expectations", "category": "communication"},
      {"title": "Open volunteer shift signup", "description": "Post volunteer opportunities for parents", "category": "volunteers"},
      {"title": "Schedule costume fittings", "description": "Coordinate with costume vendor", "category": "costumes"},
      {"title": "Reserve rehearsal spaces", "description": "Book studios for dress rehearsals", "category": "venue"}
    ]'::jsonb
  ),
  (
    '4 Weeks Before Show',
    'Important tasks 4 weeks out',
    -28,
    'pre_production',
    2,
    '[
      {"title": "Finalize performance order", "description": "Complete program builder and lock order", "category": "programming"},
      {"title": "Submit program content for printing", "description": "Proofread and send to printer", "category": "materials"},
      {"title": "Confirm all costume orders", "description": "Verify quantities and sizes", "category": "costumes"},
      {"title": "Create backstage schedules", "description": "Assign dressing rooms and quick-change areas", "category": "logistics"},
      {"title": "Schedule tech rehearsal with venue", "description": "Confirm lighting, sound, and stage setup", "category": "venue"},
      {"title": "Send reminder emails to families", "description": "Ticket sales, important dates, policies", "category": "communication"},
      {"title": "Order flowers for teachers", "description": "Arrange delivery for show day", "category": "materials"}
    ]'::jsonb
  ),
  (
    '2 Weeks Before Show',
    'Final preparations 2 weeks out',
    -14,
    'production',
    3,
    '[
      {"title": "Confirm all volunteer shifts filled", "description": "Follow up on any open positions", "category": "volunteers"},
      {"title": "Distribute programs to staff", "description": "Ensure everyone has a copy", "category": "materials"},
      {"title": "Pick up costumes and organize", "description": "Sort by class and label", "category": "costumes"},
      {"title": "Create emergency contact list", "description": "Compile all staff and vendor contacts", "category": "safety"},
      {"title": "Prepare dancer check-in materials", "description": "Print rosters and name tags", "category": "logistics"},
      {"title": "Schedule dress rehearsal", "description": "Communicate times to all families", "category": "rehearsal"},
      {"title": "Test ticketing system", "description": "Verify will-call and scanning setup", "category": "technology"}
    ]'::jsonb
  ),
  (
    '1 Week Before Show',
    'Critical final week tasks',
    -7,
    'production',
    4,
    '[
      {"title": "Hold dress rehearsal", "description": "Run full show with costumes", "category": "rehearsal"},
      {"title": "Conduct tech rehearsal at venue", "description": "Test all lighting and sound cues", "category": "venue"},
      {"title": "Send final reminder to volunteers", "description": "Include check-in instructions", "category": "volunteers"},
      {"title": "Prepare backstage kits", "description": "Safety pins, tape, sewing kit, first aid", "category": "materials"},
      {"title": "Print all backstage schedules", "description": "Post in dressing rooms", "category": "logistics"},
      {"title": "Confirm photographer/videographer", "description": "Verify arrival time and setup needs", "category": "media"},
      {"title": "Create day-of timeline", "description": "Detailed schedule for staff", "category": "planning"}
    ]'::jsonb
  ),
  (
    'Day Before Show',
    'Final 24-hour preparations',
    -1,
    'show_week',
    5,
    '[
      {"title": "Load-in equipment and costumes", "description": "Transport to venue and organize", "category": "logistics"},
      {"title": "Set up backstage areas", "description": "Dressing rooms, quick-change stations", "category": "venue"},
      {"title": "Test all technical equipment", "description": "Sound, lighting, video screens", "category": "technology"},
      {"title": "Post signage at venue", "description": "Parking, restrooms, seating sections", "category": "venue"},
      {"title": "Confirm all staff arrival times", "description": "Send group text reminder", "category": "communication"},
      {"title": "Prepare box office/will-call", "description": "Set up table, print materials", "category": "ticketing"}
    ]'::jsonb
  ),
  (
    'Day of Show',
    'Show day critical tasks',
    0,
    'show_day',
    6,
    '[
      {"title": "Staff arrival and setup", "description": "Everyone in place 2 hours early", "category": "logistics"},
      {"title": "Volunteer check-in", "description": "Distribute assignments and materials", "category": "volunteers"},
      {"title": "Dancer check-in begins", "description": "Verify attendance and distribute items", "category": "logistics"},
      {"title": "Final tech check", "description": "Test all equipment one last time", "category": "technology"},
      {"title": "Pre-show staff meeting", "description": "Review timeline and troubleshoot", "category": "communication"},
      {"title": "Open house for ticket scanning", "description": "Begin admitting audience", "category": "ticketing"},
      {"title": "Places call", "description": "All performers in position", "category": "show"},
      {"title": "Show begins!", "description": "Enjoy the performance", "category": "show"}
    ]'::jsonb
  ),
  (
    'Day After Show',
    'Post-show wrap-up tasks',
    1,
    'post_production',
    7,
    '[
      {"title": "Load out and cleanup", "description": "Remove all studio items from venue", "category": "logistics"},
      {"title": "Return costumes", "description": "Clean and return to vendor", "category": "costumes"},
      {"title": "Send thank you to volunteers", "description": "Email appreciation message", "category": "communication"},
      {"title": "Collect and organize photos/videos", "description": "Upload to media gallery", "category": "media"},
      {"title": "Process final ticket revenue", "description": "Reconcile sales and deposits", "category": "finance"},
      {"title": "Debrief meeting with staff", "description": "Discuss what went well and improvements", "category": "planning"},
      {"title": "Archive recital materials", "description": "Save programs, schedules, notes for next year", "category": "administration"}
    ]'::jsonb
  );

-- Enable RLS
ALTER TABLE recital_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recital_task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task templates (admin/staff can manage)
CREATE POLICY "Anyone can view task templates"
  ON recital_task_templates FOR SELECT
  USING (true);

CREATE POLICY "Admin and staff can manage task templates"
  ON recital_task_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- RLS Policies for task attachments
CREATE POLICY "Users can view task attachments if they can view the task"
  ON recital_task_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recital_tasks
      WHERE recital_tasks.id = task_id
    )
  );

CREATE POLICY "Users can manage attachments for tasks they can edit"
  ON recital_task_attachments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );
