/**
 * Tier 1 Feature Types
 *
 * TypeScript interfaces for Tier 1 recital management features:
 * - Rehearsal Management
 * - Recital Fees & Payment Tracking
 * - Performer Confirmation (planned)
 * - Email Campaigns (planned)
 * - Show-Day Check-In (planned)
 */

import type { Student } from './index'

// ============================================================
// REHEARSAL MANAGEMENT
// ============================================================

export type RehearsalType = 'tech' | 'dress' | 'stage' | 'full' | 'other'
export type RehearsalStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled'

export interface RecitalRehearsal {
  id: string
  recital_show_id: string
  name: string
  type: RehearsalType
  date: string // ISO date
  start_time: string // HH:MM
  end_time: string // HH:MM
  location?: string
  description?: string
  call_time?: string // HH:MM
  notes?: string
  status: RehearsalStatus
  created_at: string
  updated_at: string
}

export interface RehearsalParticipant {
  id: string
  rehearsal_id: string
  class_instance_id?: string
  performance_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'late'

export interface RehearsalAttendance {
  id: string
  rehearsal_id: string
  student_id: string
  status: AttendanceStatus
  check_in_time?: string // ISO timestamp
  check_out_time?: string // ISO timestamp
  notes?: string
  parent_notified_at?: string // ISO timestamp
  created_at: string
  updated_at: string
  student?: Student
}

export type ResourceType = 'video' | 'document' | 'image' | 'link' | 'other'

export interface RehearsalResource {
  id: string
  rehearsal_id: string
  title: string
  description?: string
  resource_type: ResourceType
  file_url?: string
  external_url?: string
  is_public: boolean // Parents can view
  created_at: string
  updated_at: string
}

// Extended types with relations
export interface RehearsalWithDetails extends RecitalRehearsal {
  participant_count?: number
  attendance_count?: number
  resources?: RehearsalResource[]
  participants?: RehearsalParticipant[]
}

export interface RehearsalAttendanceRecord extends RehearsalAttendance {
  rehearsal?: RecitalRehearsal
  student?: Student
}

export interface RehearsalSummary {
  id: string
  name: string
  date: string
  start_time: string
  end_time: string
  participant_count: number
  attendance_taken: number
  attendance_present: number
  attendance_absent: number
}

// Form types for create/edit
export interface CreateRehearsalInput {
  recital_show_id: string
  name: string
  type: RehearsalType
  date: string
  start_time: string
  end_time: string
  location?: string
  description?: string
  call_time?: string
  notes?: string
  participant_ids?: string[] // class_instance_ids or performance_ids
}

export interface UpdateRehearsalInput extends Partial<CreateRehearsalInput> {
  id: string
  status?: RehearsalStatus
}

export interface BulkAttendanceInput {
  rehearsal_id: string
  attendance_records: Array<{
    student_id: string
    status: AttendanceStatus
    notes?: string
  }>
}

// ============================================================
// RECITAL FEES & PAYMENT TRACKING
// ============================================================

export type FeeType = 'participation' | 'costume' | 'makeup' | 'props' | 'ticket' | 'photo' | 'video' | 'other'
export type FeeStatus = 'pending' | 'partial' | 'paid' | 'waived' | 'refunded' | 'overdue'
export type PaymentMethod = 'stripe' | 'cash' | 'check' | 'bank_transfer' | 'other'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'

export interface RecitalFeeType {
  id: string
  recital_show_id: string
  name: string
  description?: string
  fee_type: FeeType
  default_amount_in_cents: number
  is_required: boolean
  early_bird_amount_in_cents?: number
  early_bird_deadline?: string // ISO date
  late_fee_amount_in_cents?: number
  late_fee_start_date?: string // ISO date
  due_date?: string // ISO date
  created_at: string
  updated_at: string
}

export interface StudentRecitalFee {
  id: string
  student_id: string
  recital_show_id: string
  fee_type_id: string
  total_amount_in_cents: number
  amount_paid_in_cents: number
  balance_in_cents: number
  status: FeeStatus
  waived: boolean
  waived_reason?: string
  notes?: string
  created_at: string
  updated_at: string
  student?: Student
  fee_type?: RecitalFeeType
}

export interface RecitalPaymentTransaction {
  id: string
  student_fee_id: string
  amount_in_cents: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  stripe_payment_intent_id?: string
  stripe_charge_id?: string
  transaction_reference?: string // Check number, transfer ID, etc.
  paid_by_guardian_id?: string
  paid_at?: string // ISO timestamp
  refunded_at?: string // ISO timestamp
  refund_reason?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface RecitalPaymentPlan {
  id: string
  student_id: string
  recital_show_id: string
  total_amount_in_cents: number
  number_of_installments: number
  installment_amount_in_cents: number
  first_installment_date: string // ISO date
  frequency: 'weekly' | 'bi-weekly' | 'monthly'
  created_at: string
  updated_at: string
}

export type InstallmentStatus = 'upcoming' | 'due' | 'paid' | 'overdue' | 'skipped'

export interface PaymentPlanInstallment {
  id: string
  payment_plan_id: string
  installment_number: number
  due_date: string // ISO date
  amount_in_cents: number
  status: InstallmentStatus
  paid_at?: string // ISO timestamp
  transaction_id?: string
  created_at: string
  updated_at: string
}

// Extended types with relations
export interface FeeTypeWithAssignments extends RecitalFeeType {
  assigned_count?: number
  total_collected_in_cents?: number
  total_outstanding_in_cents?: number
}

export interface StudentFeeWithDetails extends StudentRecitalFee {
  student?: Student
  fee_type?: RecitalFeeType
  transactions?: RecitalPaymentTransaction[]
  payment_plan?: RecitalPaymentPlan
}

export interface PaymentPlanWithInstallments extends RecitalPaymentPlan {
  student?: Student
  installments?: PaymentPlanInstallment[]
  paid_installments_count?: number
  overdue_installments_count?: number
}

export interface ParentPaymentSummary {
  guardian_id: string
  recital_show_id: string
  total_fees_in_cents: number
  total_paid_in_cents: number
  total_balance_in_cents: number
  student_count: number
  overdue_count: number
}

// Form types for create/edit
export interface CreateFeeTypeInput {
  recital_show_id: string
  name: string
  description?: string
  fee_type: FeeType
  default_amount_in_cents: number
  is_required: boolean
  early_bird_amount_in_cents?: number
  early_bird_deadline?: string
  late_fee_amount_in_cents?: number
  late_fee_start_date?: string
  due_date?: string
}

export interface UpdateFeeTypeInput extends Partial<CreateFeeTypeInput> {
  id: string
}

export interface AssignFeesInput {
  recital_show_id: string
  fee_type_id: string
  student_ids: string[]
  custom_amount_in_cents?: number
  notes?: string
}

export interface RecordPaymentInput {
  student_fee_id: string
  amount_in_cents: number
  payment_method: PaymentMethod
  transaction_reference?: string
  paid_by_guardian_id?: string
  notes?: string
}

export interface StripePaymentInput {
  student_fee_ids: string[] // Can pay multiple fees at once
  amount_in_cents: number
  stripe_payment_method_id: string
  guardian_id: string
  save_payment_method?: boolean
}

export interface CreatePaymentPlanInput {
  student_id: string
  recital_show_id: string
  total_amount_in_cents: number
  number_of_installments: number
  first_installment_date: string
  frequency: 'weekly' | 'bi-weekly' | 'monthly'
}

export interface UpdatePaymentPlanInput extends Partial<CreatePaymentPlanInput> {
  id: string
}

export interface WaiveFeeInput {
  student_fee_id: string
  waived_reason: string
}

export interface RefundPaymentInput {
  transaction_id: string
  refund_amount_in_cents: number
  refund_reason: string
}

// ============================================================
// TASKS & CHECKLIST (Tier 1 Feature 3)
// ============================================================

export type TaskStatus = 'not-started' | 'in-progress' | 'completed' | 'blocked' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskCategory = 'venue' | 'costumes' | 'tech' | 'marketing' | 'admin' | 'rehearsal' | 'performance' | 'other'

export interface RecitalTask {
  id: string
  recital_show_id: string
  title: string
  description?: string
  category: TaskCategory
  status: TaskStatus
  priority: TaskPriority
  assigned_to_user_id?: string
  assigned_to_role?: 'admin' | 'staff' | 'teacher' | 'parent' | 'volunteer'
  due_date?: string // ISO date
  completed_at?: string // ISO timestamp
  completed_by_user_id?: string
  is_template: boolean
  parent_task_id?: string // For subtasks
  depends_on_task_id?: string // Task dependency
  estimated_hours?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface TaskTemplate {
  id: string
  name: string
  description?: string
  category: TaskCategory
  priority: TaskPriority
  estimated_hours?: number
  default_days_before_show?: number // When to schedule relative to show date
  is_public: boolean // Available to all users
  created_by_user_id?: string
  created_at: string
  updated_at: string
}

export interface TaskTemplateItem {
  id: string
  template_id: string
  title: string
  description?: string
  category: TaskCategory
  priority: TaskPriority
  order_index: number
  estimated_hours?: number
  default_assigned_to_role?: 'admin' | 'staff' | 'teacher' | 'parent' | 'volunteer'
  created_at: string
  updated_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  comment: string
  created_at: string
  updated_at: string
}

export interface TaskAttachment {
  id: string
  task_id: string
  file_name: string
  file_url: string
  file_size_bytes: number
  file_type: string
  uploaded_by_user_id: string
  created_at: string
  updated_at: string
}

// Extended types with relations
export interface TaskWithDetails extends RecitalTask {
  assigned_to_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  completed_by_user?: {
    id: string
    first_name: string
    last_name: string
  }
  parent_task?: RecitalTask
  depends_on_task?: RecitalTask
  subtasks?: RecitalTask[]
  comments?: TaskComment[]
  attachments?: TaskAttachment[]
}

export interface TaskListSummary {
  total_tasks: number
  not_started: number
  in_progress: number
  completed: number
  blocked: number
  overdue: number
  due_this_week: number
  completion_rate: number
}

export interface TasksByCategory {
  category: TaskCategory
  tasks: RecitalTask[]
  completion_rate: number
}

// Form types for create/edit
export interface CreateTaskInput {
  recital_show_id: string
  title: string
  description?: string
  category: TaskCategory
  priority: TaskPriority
  assigned_to_user_id?: string
  assigned_to_role?: 'admin' | 'staff' | 'teacher' | 'parent' | 'volunteer'
  due_date?: string
  parent_task_id?: string
  depends_on_task_id?: string
  estimated_hours?: number
  notes?: string
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string
  status?: TaskStatus
}

export interface CreateTaskFromTemplateInput {
  recital_show_id: string
  template_id: string
  show_date: string // To calculate due dates
  assigned_to_user_id?: string
}

export interface BulkUpdateTaskStatusInput {
  task_ids: string[]
  status: TaskStatus
}

// ============================================================
// PERFORMER CONFIRMATION (Planned - Tier 1 Feature 4)
// ============================================================

export type ConfirmationStatus = 'pending' | 'confirmed' | 'declined' | 'expired'

export interface PerformerConfirmation {
  id: string
  student_id: string
  recital_show_id: string
  status: ConfirmationStatus
  confirmed_at?: string
  declined_at?: string
  confirmed_by_guardian_id?: string
  confirmation_code?: string
  notes?: string
  created_at: string
  updated_at: string
}

// ============================================================
// EMAIL CAMPAIGNS (Planned - Tier 1 Feature 4)
// ============================================================

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
export type EmailStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'

export interface EmailCampaign {
  id: string
  recital_show_id?: string
  name: string
  subject: string
  body_html: string
  body_text?: string
  status: CampaignStatus
  scheduled_at?: string
  sent_at?: string
  created_at: string
  updated_at: string
}

export interface CampaignRecipient {
  id: string
  campaign_id: string
  email: string
  guardian_id?: string
  status: EmailStatus
  sent_at?: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  bounced_at?: string
  error_message?: string
  created_at: string
  updated_at: string
}

// ============================================================
// SHOW-DAY CHECK-IN (Planned - Tier 1 Feature 5)
// ============================================================

export type CheckInType = 'arrival' | 'dressing_room' | 'backstage' | 'on_deck' | 'on_stage'
export type CheckInStatus = 'checked_in' | 'checked_out' | 'no_show'

export interface ShowDayCheckIn {
  id: string
  student_id: string
  recital_show_id: string
  check_in_type: CheckInType
  check_in_time: string
  check_out_time?: string
  status: CheckInStatus
  checked_in_by_staff_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  data: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ValidationError {
  field: string
  message: string
}

export interface ApiErrorResponse {
  error: string
  message: string
  statusCode: number
  validationErrors?: ValidationError[]
}
