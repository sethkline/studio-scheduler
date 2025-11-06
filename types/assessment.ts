/**
 * Student Progress & Assessment System - Type Definitions
 *
 * Comprehensive TypeScript types for evaluations, skill tracking,
 * progress reports, achievements, and video progress tracking.
 */

// ============================================================================
// EVALUATIONS
// ============================================================================

export type EvaluationStatus = 'draft' | 'submitted'
export type SkillRating = 'needs_work' | 'proficient' | 'excellent'
export type SkillCategory = 'technique' | 'musicality' | 'performance' | 'strength' | 'flexibility'

export interface Evaluation {
  id: string
  student_id: string
  teacher_id: string
  class_instance_id: string
  schedule_id?: string
  overall_rating?: number // 1-5
  effort_rating?: number // 1-5
  attitude_rating?: number // 1-5
  strengths?: string
  areas_for_improvement?: string
  comments?: string
  recommended_next_level?: string
  status: EvaluationStatus
  submitted_at?: string
  created_at: string
  updated_at: string
}

export interface EvaluationSkill {
  id: string
  evaluation_id: string
  skill_name: string
  skill_category?: SkillCategory
  rating: SkillRating
  notes?: string
  created_at: string
}

export interface EvaluationWithSkills extends Evaluation {
  skills: EvaluationSkill[]
  student?: {
    id: string
    first_name: string
    last_name: string
  }
  teacher?: {
    id: string
    first_name: string
    last_name: string
  }
  class_instance?: {
    id: string
    name: string
  }
}

export interface EvaluationFormData {
  student_id: string
  teacher_id: string
  class_instance_id: string
  schedule_id?: string
  overall_rating?: number
  effort_rating?: number
  attitude_rating?: number
  strengths?: string
  areas_for_improvement?: string
  comments?: string
  recommended_next_level?: string
  skills: {
    skill_name: string
    skill_category?: SkillCategory
    rating: SkillRating
    notes?: string
  }[]
}

// ============================================================================
// SKILLS
// ============================================================================

export interface Skill {
  id: string
  name: string
  description?: string
  dance_style_id?: string
  class_level_id?: string
  category: SkillCategory
  required_for_advancement: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface SkillWithRelations extends Skill {
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

export type MasteryStatus = 'not_started' | 'in_progress' | 'mastered'

export interface StudentSkill {
  id: string
  student_id: string
  skill_id: string
  class_instance_id?: string
  mastery_status: MasteryStatus
  date_started?: string
  date_mastered?: string
  confirmed_by_teacher_id?: string
  video_proof_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface StudentSkillWithDetails extends StudentSkill {
  skill?: Skill
  confirmed_by_teacher?: {
    id: string
    first_name: string
    last_name: string
  }
  video_proof?: ProgressVideo
}

export interface SkillProgress {
  total_skills: number
  not_started: number
  in_progress: number
  mastered: number
  progress_percentage: number
}

export interface SkillsByCategory {
  category: SkillCategory
  skills: StudentSkillWithDetails[]
  total: number
  mastered: number
  progress_percentage: number
}

// ============================================================================
// ACHIEVEMENTS
// ============================================================================

export type AchievementType = 'attendance' | 'skill' | 'performance' | 'milestone' | 'custom'

export interface AchievementCriteria {
  type: string
  [key: string]: any
}

// Example criteria structures:
export interface AttendanceCriteria extends AchievementCriteria {
  type: 'attendance'
  threshold: number
  period: 'term' | 'year' | 'all_time'
}

export interface SkillMasteryCriteria extends AchievementCriteria {
  type: 'skill_mastery'
  skills_required?: number
  all_skills_for_level?: boolean
  level_id?: string
}

export interface RecitalCriteria extends AchievementCriteria {
  type: 'recital'
  recitals_performed: number
}

export interface TenureCriteria extends AchievementCriteria {
  type: 'tenure'
  years: number
}

export interface ManualCriteria extends AchievementCriteria {
  type: 'manual'
  teacher_awarded: boolean
}

export interface Achievement {
  id: string
  name: string
  description: string
  achievement_type: AchievementType
  badge_icon?: string
  badge_color?: string
  criteria: AchievementCriteria
  is_active: boolean
  auto_award: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface StudentAchievement {
  id: string
  student_id: string
  achievement_id: string
  date_earned: string
  awarded_by_teacher_id?: string
  notes?: string
  is_featured: boolean
  created_at: string
}

export interface StudentAchievementWithDetails extends StudentAchievement {
  achievement?: Achievement
  awarded_by_teacher?: {
    id: string
    first_name: string
    last_name: string
  }
}

// ============================================================================
// PROGRESS REPORTS
// ============================================================================

export type ProgressReportStatus = 'draft' | 'published' | 'archived'

export interface ProgressReport {
  id: string
  student_id: string
  schedule_id?: string
  generated_at: string
  generated_by_teacher_id?: string
  evaluation_id?: string
  attendance_rate?: number
  classes_attended?: number
  total_classes?: number
  skills_mastered_count?: number
  total_skills_count?: number
  pdf_url?: string
  parent_notified_at?: string
  parent_viewed_at?: string
  status: ProgressReportStatus
  created_at: string
  updated_at: string
}

export interface ProgressReportWithDetails extends ProgressReport {
  student?: {
    id: string
    first_name: string
    last_name: string
    date_of_birth: string
  }
  schedule?: {
    id: string
    name: string
    start_date: string
    end_date: string
  }
  evaluation?: EvaluationWithSkills
  generated_by_teacher?: {
    id: string
    first_name: string
    last_name: string
  }
  achievements?: StudentAchievementWithDetails[]
}

export interface ProgressReportData {
  student_id: string
  schedule_id?: string
  evaluation_id?: string
  attendance_data: {
    rate: number
    classes_attended: number
    total_classes: number
  }
  skills_data: {
    mastered_count: number
    total_count: number
    skills_by_category: SkillsByCategory[]
  }
  achievements: StudentAchievementWithDetails[]
  class_enrollments: {
    class_name: string
    teacher_name: string
    attendance_rate: number
  }[]
}

// ============================================================================
// PROGRESS VIDEOS
// ============================================================================

export type VideoVisibility = 'private' | 'student_parent' | 'public'

export interface VideoAnnotation {
  timestamp: number // seconds
  comment: string
  type: 'positive' | 'constructive' | 'note'
}

export interface ProgressVideo {
  id: string
  student_id: string
  teacher_id: string
  skill_id?: string
  class_instance_id?: string
  title: string
  description?: string
  file_path: string
  file_size_bytes?: number
  mime_type?: string
  duration_seconds?: number
  thumbnail_path?: string
  recorded_date?: string
  uploaded_at: string
  visibility: VideoVisibility
  annotations?: VideoAnnotation[]
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface ProgressVideoWithDetails extends ProgressVideo {
  student?: {
    id: string
    first_name: string
    last_name: string
  }
  teacher?: {
    id: string
    first_name: string
    last_name: string
  }
  skill?: Skill
  class_instance?: {
    id: string
    name: string
  }
}

export interface VideoComparisonData {
  student_id: string
  skill_id?: string
  videos: ProgressVideoWithDetails[]
  date_range: {
    start: string
    end: string
  }
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateEvaluationRequest {
  evaluation: Omit<Evaluation, 'id' | 'created_at' | 'updated_at' | 'submitted_at'>
  skills: Omit<EvaluationSkill, 'id' | 'evaluation_id' | 'created_at'>[]
}

export interface UpdateEvaluationRequest {
  evaluation: Partial<Omit<Evaluation, 'id' | 'created_at' | 'updated_at'>>
  skills?: Omit<EvaluationSkill, 'id' | 'evaluation_id' | 'created_at'>[]
}

export interface EvaluationListResponse {
  evaluations: EvaluationWithSkills[]
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

export interface SkillTemplateRequest {
  dance_style_id: string
  class_level_id: string
}

export interface SkillTemplateResponse {
  skills: Skill[]
  categories: {
    category: SkillCategory
    skills: Skill[]
  }[]
}

export interface UpdateStudentSkillRequest {
  mastery_status: MasteryStatus
  date_started?: string
  date_mastered?: string
  notes?: string
  video_proof_id?: string
}

export interface StudentProgressSummary {
  student_id: string
  overall_progress: SkillProgress
  by_category: SkillsByCategory[]
  recent_achievements: StudentAchievementWithDetails[]
  class_averages: {
    class_instance_id: string
    class_name: string
    student_progress: number
    class_average: number
  }[]
}

export interface CreateAchievementRequest {
  name: string
  description: string
  achievement_type: AchievementType
  badge_icon?: string
  badge_color?: string
  criteria: AchievementCriteria
  auto_award?: boolean
}

export interface AwardAchievementRequest {
  student_id: string
  achievement_id: string
  notes?: string
  awarded_by_teacher_id?: string
}

export interface GenerateProgressReportRequest {
  student_id: string
  schedule_id?: string
  evaluation_id?: string
  include_achievements?: boolean
  send_email?: boolean
}

export interface GenerateProgressReportResponse {
  report: ProgressReportWithDetails
  pdf_url?: string
}

export interface UploadProgressVideoRequest {
  student_id: string
  skill_id?: string
  class_instance_id?: string
  title: string
  description?: string
  recorded_date?: string
  visibility?: VideoVisibility
}

export interface VideoUploadResponse {
  video: ProgressVideoWithDetails
  upload_url?: string
}

export interface AddVideoAnnotationRequest {
  video_id: string
  annotation: VideoAnnotation
}

// ============================================================================
// FILTER AND QUERY TYPES
// ============================================================================

export interface EvaluationFilters {
  student_id?: string
  teacher_id?: string
  class_instance_id?: string
  schedule_id?: string
  status?: EvaluationStatus
  from_date?: string
  to_date?: string
}

export interface SkillFilters {
  dance_style_id?: string
  class_level_id?: string
  category?: SkillCategory
  required_for_advancement?: boolean
}

export interface StudentSkillFilters {
  student_id?: string
  skill_id?: string
  class_instance_id?: string
  mastery_status?: MasteryStatus
  confirmed_by_teacher_id?: string
}

export interface AchievementFilters {
  achievement_type?: AchievementType
  is_active?: boolean
  auto_award?: boolean
}

export interface StudentAchievementFilters {
  student_id?: string
  achievement_id?: string
  awarded_by_teacher_id?: string
  date_from?: string
  date_to?: string
}

export interface ProgressReportFilters {
  student_id?: string
  schedule_id?: string
  status?: ProgressReportStatus
  generated_by_teacher_id?: string
  from_date?: string
  to_date?: string
}

export interface ProgressVideoFilters {
  student_id?: string
  teacher_id?: string
  skill_id?: string
  class_instance_id?: string
  visibility?: VideoVisibility
  is_archived?: boolean
  from_date?: string
  to_date?: string
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PaginationParams {
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

// ============================================================================
// FORM VALIDATION TYPES
// ============================================================================

export interface EvaluationFormErrors {
  student_id?: string
  teacher_id?: string
  class_instance_id?: string
  overall_rating?: string
  effort_rating?: string
  attitude_rating?: string
  strengths?: string
  areas_for_improvement?: string
  comments?: string
  skills?: {
    [index: number]: {
      skill_name?: string
      rating?: string
    }
  }
}

export interface SkillFormErrors {
  name?: string
  description?: string
  dance_style_id?: string
  class_level_id?: string
  category?: string
}

export interface AchievementFormErrors {
  name?: string
  description?: string
  achievement_type?: string
  criteria?: string
}

export interface VideoUploadFormErrors {
  student_id?: string
  title?: string
  file?: string
  skill_id?: string
  recorded_date?: string
}
