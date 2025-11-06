// Volunteer Shift Management Types

export type VolunteerSignupStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type VolunteerCalculationBasis = 'per_student' | 'per_performance' | 'flat_rate'
export type TaskCategory = 'pre_show' | 'day_of' | 'post_show' | 'general'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface VolunteerShift {
  id: string
  recital_id?: string
  recital_show_id?: string
  role_name: string
  description?: string
  shift_date: string
  start_time: string
  end_time: string
  volunteers_needed: number
  volunteers_filled: number
  location?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface VolunteerSignup {
  id: string
  volunteer_shift_id: string
  guardian_id: string
  signup_date: string
  status: VolunteerSignupStatus
  hours_credited: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface VolunteerRequirement {
  id: string
  recital_id: string
  guardian_id: string
  required_hours: number
  completed_hours: number
  calculation_basis?: VolunteerCalculationBasis
  notes?: string
  created_at: string
  updated_at: string
}

export interface RecitalTask {
  id: string
  recital_id: string
  recital_show_id?: string
  title: string
  description?: string
  category?: TaskCategory
  priority: TaskPriority
  due_date?: string
  assigned_to?: string
  assigned_role?: string
  status: TaskStatus
  completed_at?: string
  completed_by?: string
  notes?: string
  sort_order: number
  created_at: string
  updated_at: string
}

// Extended types with relationships

export interface VolunteerShiftWithDetails extends VolunteerShift {
  recital?: {
    id: string
    name: string
  }
  recital_show?: {
    id: string
    title: string
    date: string
    start_time: string
  }
  signups?: VolunteerSignupWithGuardian[]
}

export interface VolunteerSignupWithGuardian extends VolunteerSignup {
  guardian?: {
    id: string
    first_name: string
    last_name: string
    email?: string
    phone?: string
  }
  volunteer_shift?: VolunteerShift
}

export interface VolunteerSignupWithDetails extends VolunteerSignup {
  guardian?: {
    id: string
    first_name: string
    last_name: string
  }
  volunteer_shift?: VolunteerShiftWithDetails
}

export interface VolunteerRequirementWithDetails extends VolunteerRequirement {
  guardian?: {
    id: string
    first_name: string
    last_name: string
  }
  recital?: {
    id: string
    name: string
  }
  signups?: VolunteerSignup[]
}

export interface RecitalTaskWithDetails extends RecitalTask {
  recital?: {
    id: string
    name: string
  }
  recital_show?: {
    id: string
    title: string
  }
  assigned_user?: {
    id: string
    first_name: string
    last_name: string
  }
  completed_by_user?: {
    id: string
    first_name: string
    last_name: string
  }
}

// Form types

export interface CreateVolunteerShiftForm {
  recital_id?: string
  recital_show_id?: string
  role_name: string
  description?: string
  shift_date: string
  start_time: string
  end_time: string
  volunteers_needed: number
  location?: string
  notes?: string
}

export interface UpdateVolunteerShiftForm extends Partial<CreateVolunteerShiftForm> {
  volunteers_filled?: number
}

export interface CreateVolunteerSignupForm {
  volunteer_shift_id: string
  guardian_id: string
  notes?: string
}

export interface UpdateVolunteerSignupForm {
  status?: VolunteerSignupStatus
  hours_credited?: number
  notes?: string
}

export interface CreateVolunteerRequirementForm {
  recital_id: string
  guardian_id: string
  required_hours: number
  calculation_basis?: VolunteerCalculationBasis
  notes?: string
}

export interface UpdateVolunteerRequirementForm {
  required_hours?: number
  completed_hours?: number
  notes?: string
}

export interface CreateRecitalTaskForm {
  recital_id: string
  recital_show_id?: string
  title: string
  description?: string
  category?: TaskCategory
  priority?: TaskPriority
  due_date?: string
  assigned_to?: string
  assigned_role?: string
  notes?: string
  sort_order?: number
}

export interface UpdateRecitalTaskForm extends Partial<CreateRecitalTaskForm> {
  status?: TaskStatus
  completed_at?: string
  completed_by?: string
}

// Summary/Report types

export interface VolunteerShiftSummary {
  total_shifts: number
  total_volunteers_needed: number
  total_volunteers_filled: number
  unfilled_shifts: number
  shifts_by_role: Record<string, number>
}

export interface GuardianVolunteerSummary {
  guardian_id: string
  guardian_name: string
  required_hours: number
  completed_hours: number
  confirmed_signups: number
  pending_hours: number
  is_fulfilled: boolean
}

export interface RecitalTaskSummary {
  total_tasks: number
  pending: number
  in_progress: number
  completed: number
  cancelled: number
  overdue: number
  tasks_by_category: Record<string, number>
}
