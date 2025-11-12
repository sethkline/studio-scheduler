/**
 * TypeScript types for Lesson Planning feature
 * Story 5.3.2: Lesson Planning
 */

// ============================================
// Learning Objectives / Skills
// ============================================
export interface LearningObjective {
  id: string
  class_definition_id?: string
  dance_style_id?: string
  class_level_id?: string
  title: string
  description?: string
  category?: 'technique' | 'choreography' | 'musicality' | 'performance' | 'conditioning' | 'theory' | 'other'
  skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'professional'
  sequence_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Expanded relations
  dance_style?: {
    id: string
    name: string
    color: string
  }
  class_level?: {
    id: string
    name: string
  }
  class_definition?: {
    id: string
    name: string
  }
}

export interface CreateLearningObjectiveInput {
  class_definition_id?: string
  dance_style_id?: string
  class_level_id?: string
  title: string
  description?: string
  category?: string
  skill_level?: string
  sequence_order?: number
  is_active?: boolean
}

export interface UpdateLearningObjectiveInput extends Partial<CreateLearningObjectiveInput> {
  id: string
}

// ============================================
// Lesson Plan Templates
// ============================================
export interface LessonPlanTemplate {
  id: string
  teacher_id: string
  name: string
  description?: string
  dance_style_id?: string
  class_level_id?: string
  duration?: number // minutes
  content?: any // TipTap JSON content
  objectives?: string[] | LearningObjective[] // Array of objective IDs or objects
  materials_needed?: string
  warm_up?: string
  main_activity?: string
  cool_down?: string
  notes?: string
  is_public: boolean
  use_count: number
  created_at: string
  updated_at: string
  // Expanded relations
  teacher?: {
    id: string
    first_name: string
    last_name: string
  }
  dance_style?: {
    id: string
    name: string
    color: string
  }
  class_level?: {
    id: string
    name: string
  }
}

export interface CreateLessonPlanTemplateInput {
  teacher_id: string
  name: string
  description?: string
  dance_style_id?: string
  class_level_id?: string
  duration?: number
  content?: any
  objectives?: string[]
  materials_needed?: string
  warm_up?: string
  main_activity?: string
  cool_down?: string
  notes?: string
  is_public?: boolean
}

export interface UpdateLessonPlanTemplateInput extends Partial<CreateLessonPlanTemplateInput> {
  id: string
}

// ============================================
// Lesson Plans
// ============================================
export type LessonPlanStatus = 'draft' | 'planned' | 'in_progress' | 'completed' | 'cancelled'

export interface LessonPlan {
  id: string
  class_instance_id: string
  teacher_id: string
  template_id?: string
  lesson_date: string // ISO date string
  title: string
  description?: string
  duration?: number // minutes
  content?: any // TipTap JSON content
  objectives?: string[] | LearningObjective[] // Array of objective IDs or objects
  materials_needed?: string
  warm_up?: string
  main_activity?: string
  cool_down?: string
  homework?: string
  notes?: string
  status: LessonPlanStatus
  is_archived: boolean
  completed_at?: string
  created_at: string
  updated_at: string
  // Expanded relations
  class_instance?: {
    id: string
    class_definition_id: string
    class_name: string
    dance_style?: string
  }
  teacher?: {
    id: string
    first_name: string
    last_name: string
    profile_image_url?: string
  }
  template?: {
    id: string
    name: string
  }
  shared_with?: LessonPlanShare[]
  attachments?: LessonPlanAttachment[]
  linked_objectives?: LessonPlanObjective[]
}

export interface CreateLessonPlanInput {
  class_instance_id: string
  teacher_id: string
  template_id?: string
  lesson_date: string
  title: string
  description?: string
  duration?: number
  content?: any
  objectives?: string[]
  materials_needed?: string
  warm_up?: string
  main_activity?: string
  cool_down?: string
  homework?: string
  notes?: string
  status?: LessonPlanStatus
}

export interface UpdateLessonPlanInput extends Partial<CreateLessonPlanInput> {
  id: string
  is_archived?: boolean
  completed_at?: string
}

// ============================================
// Lesson Plan Objectives (Junction)
// ============================================
export interface LessonPlanObjective {
  id: string
  lesson_plan_id: string
  learning_objective_id: string
  is_primary: boolean
  notes?: string
  created_at: string
  // Expanded relations
  learning_objective?: LearningObjective
}

export interface CreateLessonPlanObjectiveInput {
  lesson_plan_id: string
  learning_objective_id: string
  is_primary?: boolean
  notes?: string
}

// ============================================
// Lesson Plan Sharing
// ============================================
export type SharePermissionLevel = 'view' | 'edit' | 'copy'

export interface LessonPlanShare {
  id: string
  lesson_plan_id: string
  shared_with_teacher_id: string
  shared_by_teacher_id: string
  permission_level: SharePermissionLevel
  message?: string
  created_at: string
  // Expanded relations
  shared_with_teacher?: {
    id: string
    first_name: string
    last_name: string
    email?: string
  }
  shared_by_teacher?: {
    id: string
    first_name: string
    last_name: string
  }
  lesson_plan?: {
    id: string
    title: string
    lesson_date: string
  }
}

export interface CreateLessonPlanShareInput {
  lesson_plan_id: string
  shared_with_teacher_id: string
  shared_by_teacher_id: string
  permission_level?: SharePermissionLevel
  message?: string
}

export interface UpdateLessonPlanShareInput {
  id: string
  permission_level?: SharePermissionLevel
}

// ============================================
// Student Progress Tracking
// ============================================
export type ProgressLevel = 'not_started' | 'introduced' | 'practicing' | 'proficient' | 'mastered'

export interface StudentObjectiveProgress {
  id: string
  student_id: string
  learning_objective_id: string
  lesson_plan_id: string
  class_instance_id: string
  progress_level: ProgressLevel
  assessment_date?: string
  notes?: string
  teacher_id?: string
  created_at: string
  updated_at: string
  // Expanded relations
  student?: {
    id: string
    first_name: string
    last_name: string
  }
  learning_objective?: LearningObjective
  teacher?: {
    id: string
    first_name: string
    last_name: string
  }
}

export interface CreateStudentObjectiveProgressInput {
  student_id: string
  learning_objective_id: string
  lesson_plan_id: string
  class_instance_id: string
  progress_level?: ProgressLevel
  assessment_date?: string
  notes?: string
  teacher_id?: string
}

export interface UpdateStudentObjectiveProgressInput {
  id: string
  progress_level?: ProgressLevel
  assessment_date?: string
  notes?: string
}

// ============================================
// Lesson Plan Attachments
// ============================================
export type AttachmentFileType = 'music' | 'video' | 'image' | 'document' | 'other'

export interface LessonPlanAttachment {
  id: string
  lesson_plan_id: string
  file_name: string
  file_url: string
  file_type?: AttachmentFileType
  file_size?: number // bytes
  description?: string
  created_at: string
}

export interface CreateLessonPlanAttachmentInput {
  lesson_plan_id: string
  file_name: string
  file_url: string
  file_type?: AttachmentFileType
  file_size?: number
  description?: string
}

// ============================================
// Curriculum Progression Tracking
// ============================================
export type CurriculumStatus = 'not_covered' | 'introduced' | 'in_progress' | 'mastered'

export interface ClassCurriculumProgress {
  id: string
  class_instance_id: string
  learning_objective_id: string
  first_introduced_lesson_id?: string
  last_practiced_lesson_id?: string
  times_practiced: number
  average_student_progress?: ProgressLevel
  status: CurriculumStatus
  created_at: string
  updated_at: string
  // Expanded relations
  learning_objective?: LearningObjective
  class_instance?: {
    id: string
    class_name: string
  }
  first_introduced_lesson?: {
    id: string
    title: string
    lesson_date: string
  }
  last_practiced_lesson?: {
    id: string
    title: string
    lesson_date: string
  }
}

// ============================================
// Query/Filter Types
// ============================================
export interface LessonPlanFilters {
  class_instance_id?: string
  teacher_id?: string
  status?: LessonPlanStatus | LessonPlanStatus[]
  is_archived?: boolean
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  limit?: number
  sort_by?: 'lesson_date' | 'created_at' | 'updated_at' | 'title'
  sort_order?: 'asc' | 'desc'
}

export interface LearningObjectiveFilters {
  class_definition_id?: string
  dance_style_id?: string
  class_level_id?: string
  category?: string
  skill_level?: string
  is_active?: boolean
  search?: string
  page?: number
  limit?: number
}

export interface LessonPlanTemplateFilters {
  teacher_id?: string
  dance_style_id?: string
  class_level_id?: string
  is_public?: boolean
  search?: string
  page?: number
  limit?: number
  sort_by?: 'name' | 'use_count' | 'created_at'
  sort_order?: 'asc' | 'desc'
}

export interface StudentProgressFilters {
  student_id?: string
  class_instance_id?: string
  learning_objective_id?: string
  lesson_plan_id?: string
  progress_level?: ProgressLevel | ProgressLevel[]
  page?: number
  limit?: number
}

// ============================================
// Response Types
// ============================================
export interface PaginatedLessonPlans {
  lesson_plans: LessonPlan[]
  pagination: {
    page: number
    limit: number
    total_items: number
    total_pages: number
  }
}

export interface PaginatedLearningObjectives {
  objectives: LearningObjective[]
  pagination: {
    page: number
    limit: number
    total_items: number
    total_pages: number
  }
}

export interface PaginatedLessonPlanTemplates {
  templates: LessonPlanTemplate[]
  pagination: {
    page: number
    limit: number
    total_items: number
    total_pages: number
  }
}

export interface StudentProgressSummary {
  student_id: string
  student_name: string
  class_instance_id: string
  total_objectives: number
  not_started: number
  introduced: number
  practicing: number
  proficient: number
  mastered: number
  progress_percentage: number
}

export interface ClassCurriculumSummary {
  class_instance_id: string
  class_name: string
  total_objectives: number
  covered_objectives: number
  coverage_percentage: number
  objectives_by_status: {
    not_covered: number
    introduced: number
    in_progress: number
    mastered: number
  }
}

// ============================================
// Form Validation Schemas (for use with VeeValidate)
// ============================================
export interface LessonPlanFormData {
  title: string
  lesson_date: string
  class_instance_id: string
  duration?: number
  description?: string
  materials_needed?: string
  warm_up?: string
  main_activity?: string
  cool_down?: string
  homework?: string
  notes?: string
  objectives?: string[]
  status: LessonPlanStatus
}

export interface LessonPlanTemplateFormData {
  name: string
  description?: string
  dance_style_id?: string
  class_level_id?: string
  duration?: number
  materials_needed?: string
  warm_up?: string
  main_activity?: string
  cool_down?: string
  notes?: string
  objectives?: string[]
  is_public: boolean
}

export interface LearningObjectiveFormData {
  title: string
  description?: string
  class_definition_id?: string
  dance_style_id?: string
  class_level_id?: string
  category?: string
  skill_level?: string
  sequence_order?: number
}
