// types/payroll.ts

/**
 * Payroll-related types for the dance studio management system
 */

// =====================================================
// Teacher Pay Rates
// =====================================================

export type PayRateType = 'hourly' | 'per_class' | 'salary'

export interface TeacherPayRate {
  id: string
  teacher_id: string
  rate_type: PayRateType
  rate_amount: number
  currency: string
  effective_from: string // ISO date
  effective_to?: string | null // ISO date
  class_definition_id?: string | null
  dance_style_id?: string | null
  overtime_enabled: boolean
  overtime_threshold_hours?: number | null
  overtime_multiplier: number
  notes?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
}

export interface CreateTeacherPayRateInput {
  teacher_id: string
  rate_type: PayRateType
  rate_amount: number
  effective_from: string
  effective_to?: string | null
  class_definition_id?: string | null
  dance_style_id?: string | null
  overtime_enabled?: boolean
  overtime_threshold_hours?: number | null
  overtime_multiplier?: number
  notes?: string
}

export interface UpdateTeacherPayRateInput extends Partial<CreateTeacherPayRateInput> {
  id: string
}

// =====================================================
// Payroll Periods
// =====================================================

export type PayrollPeriodType = 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly'
export type PayrollPeriodStatus = 'draft' | 'processing' | 'approved' | 'paid' | 'closed'

export interface PayrollPeriod {
  id: string
  period_name: string
  period_type: PayrollPeriodType
  start_date: string // ISO date
  end_date: string // ISO date
  pay_date: string // ISO date
  status: PayrollPeriodStatus
  total_hours: number
  total_regular_pay: number
  total_overtime_pay: number
  total_adjustments: number
  total_gross_pay: number
  notes?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  approved_by?: string | null
  approved_at?: string | null
}

export interface CreatePayrollPeriodInput {
  period_name: string
  period_type: PayrollPeriodType
  start_date: string
  end_date: string
  pay_date: string
  notes?: string
}

export interface UpdatePayrollPeriodInput extends Partial<CreatePayrollPeriodInput> {
  id: string
  status?: PayrollPeriodStatus
}

// =====================================================
// Payroll Time Entries
// =====================================================

export type TimeEntryType = 'scheduled' | 'manual' | 'adjustment'
export type TimeEntryStatus = 'pending' | 'approved' | 'disputed' | 'paid'

export interface PayrollTimeEntry {
  id: string
  payroll_period_id: string
  teacher_id: string
  entry_date: string // ISO date
  start_time?: string | null // HH:MM:SS
  end_time?: string | null // HH:MM:SS
  hours: number
  entry_type: TimeEntryType
  schedule_class_id?: string | null
  class_instance_id?: string | null
  is_substitute: boolean
  original_teacher_id?: string | null
  substitute_rate_override?: number | null
  pay_rate_id?: string | null
  rate_amount: number
  regular_hours: number
  overtime_hours: number
  regular_pay: number
  overtime_pay: number
  status: TimeEntryStatus
  notes?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  approved_by?: string | null
  approved_at?: string | null
}

export interface CreateTimeEntryInput {
  payroll_period_id: string
  teacher_id: string
  entry_date: string
  start_time?: string
  end_time?: string
  hours: number
  entry_type: TimeEntryType
  schedule_class_id?: string
  class_instance_id?: string
  is_substitute?: boolean
  original_teacher_id?: string
  substitute_rate_override?: number
  notes?: string
}

export interface UpdateTimeEntryInput extends Partial<CreateTimeEntryInput> {
  id: string
  status?: TimeEntryStatus
}

// Extended interface with related data for display
export interface PayrollTimeEntryWithDetails extends PayrollTimeEntry {
  teacher?: {
    id: string
    first_name: string
    last_name: string
    email?: string
  }
  original_teacher?: {
    id: string
    first_name: string
    last_name: string
  }
  class_instance?: {
    id: string
    name: string
  }
}

// =====================================================
// Payroll Adjustments
// =====================================================

export type AdjustmentType = 'bonus' | 'deduction' | 'reimbursement' | 'correction' | 'other'
export type AdjustmentStatus = 'pending' | 'approved' | 'rejected' | 'paid'

export interface PayrollAdjustment {
  id: string
  payroll_period_id: string
  teacher_id: string
  adjustment_type: AdjustmentType
  adjustment_category?: string | null
  amount: number
  description: string
  is_taxable: boolean
  status: AdjustmentStatus
  created_at: string
  updated_at: string
  created_by?: string | null
  approved_by?: string | null
  approved_at?: string | null
}

export interface CreateAdjustmentInput {
  payroll_period_id: string
  teacher_id: string
  adjustment_type: AdjustmentType
  adjustment_category?: string
  amount: number
  description: string
  is_taxable?: boolean
}

export interface UpdateAdjustmentInput extends Partial<CreateAdjustmentInput> {
  id: string
  status?: AdjustmentStatus
}

// Extended interface with related data
export interface PayrollAdjustmentWithDetails extends PayrollAdjustment {
  teacher?: {
    id: string
    first_name: string
    last_name: string
    email?: string
  }
}

// =====================================================
// Pay Stubs
// =====================================================

export type PayStubStatus = 'draft' | 'generated' | 'sent' | 'viewed'

export interface PayrollPayStub {
  id: string
  payroll_period_id: string
  teacher_id: string
  stub_number: string
  regular_hours: number
  regular_pay: number
  overtime_hours: number
  overtime_pay: number
  total_bonuses: number
  total_deductions: number
  total_reimbursements: number
  gross_pay: number
  net_pay: number
  pdf_url?: string | null
  pdf_generated_at?: string | null
  status: PayStubStatus
  sent_at?: string | null
  viewed_at?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  generated_by?: string | null
}

export interface CreatePayStubInput {
  payroll_period_id: string
  teacher_id: string
  notes?: string
}

// Extended interface with related data
export interface PayStubWithDetails extends PayrollPayStub {
  teacher?: {
    id: string
    first_name: string
    last_name: string
    email?: string
    phone?: string
  }
  payroll_period?: {
    id: string
    period_name: string
    start_date: string
    end_date: string
    pay_date: string
  }
  time_entries?: PayrollTimeEntry[]
  adjustments?: PayrollAdjustment[]
}

// =====================================================
// Payroll Export
// =====================================================

export type PayrollExportType = 'csv' | 'excel' | 'quickbooks' | 'adp' | 'gusto' | 'paychex' | 'custom'
export type ExportStatus = 'success' | 'failed' | 'partial'

export interface PayrollExportLog {
  id: string
  payroll_period_id: string
  export_type: PayrollExportType
  file_name: string
  file_url?: string | null
  file_size?: number | null
  record_count?: number | null
  total_amount?: number | null
  status: ExportStatus
  error_message?: string | null
  created_at: string
  exported_by?: string | null
}

export interface CreateExportInput {
  payroll_period_id: string
  export_type: PayrollExportType
}

// =====================================================
// Summary and Report Types
// =====================================================

export interface TeacherPayrollSummary {
  teacher_id: string
  teacher_name: string
  teacher_email?: string
  total_hours: number
  regular_hours: number
  overtime_hours: number
  regular_pay: number
  overtime_pay: number
  total_bonuses: number
  total_deductions: number
  total_reimbursements: number
  gross_pay: number
  net_pay: number
  status: PayStubStatus
  pay_stub_id?: string
}

export interface PayrollPeriodSummary {
  period: PayrollPeriod
  teacher_count: number
  teacher_summaries: TeacherPayrollSummary[]
  total_hours: number
  total_gross_pay: number
  total_net_pay: number
}

export interface PayrollReport {
  period_id: string
  period_name: string
  start_date: string
  end_date: string
  pay_date: string
  teachers: TeacherPayrollSummary[]
  totals: {
    total_hours: number
    total_regular_pay: number
    total_overtime_pay: number
    total_bonuses: number
    total_deductions: number
    total_gross_pay: number
    total_net_pay: number
  }
}

// =====================================================
// Calculation Helpers
// =====================================================

export interface OvertimeCalculation {
  regular_hours: number
  overtime_hours: number
  regular_pay: number
  overtime_pay: number
  total_pay: number
}

export interface PayrollCalculationOptions {
  teacher_id: string
  hours: number
  date: string
  period_id: string
  is_substitute?: boolean
  rate_override?: number
}

// =====================================================
// Filters and Query Types
// =====================================================

export interface PayrollPeriodFilters {
  status?: PayrollPeriodStatus
  period_type?: PayrollPeriodType
  start_date?: string
  end_date?: string
}

export interface TimeEntryFilters {
  payroll_period_id?: string
  teacher_id?: string
  entry_type?: TimeEntryType
  status?: TimeEntryStatus
  start_date?: string
  end_date?: string
  is_substitute?: boolean
}

export interface AdjustmentFilters {
  payroll_period_id?: string
  teacher_id?: string
  adjustment_type?: AdjustmentType
  status?: AdjustmentStatus
}

export interface PayStubFilters {
  payroll_period_id?: string
  teacher_id?: string
  status?: PayStubStatus
}

// =====================================================
// Bulk Operations
// =====================================================

export interface BulkTimeEntryGenerationInput {
  payroll_period_id: string
  schedule_id?: string
  teacher_ids?: string[]
  auto_calculate?: boolean
}

export interface BulkPayStubGenerationInput {
  payroll_period_id: string
  teacher_ids?: string[]
  send_email?: boolean
}

export interface BulkApprovalInput {
  time_entry_ids?: string[]
  adjustment_ids?: string[]
}

// =====================================================
// Dashboard and Analytics
// =====================================================

export interface PayrollDashboardStats {
  current_period?: PayrollPeriod
  pending_approvals: {
    time_entries: number
    adjustments: number
  }
  recent_periods: PayrollPeriod[]
  teacher_stats: {
    total_teachers: number
    active_teachers: number
    total_hours_this_period: number
    total_pay_this_period: number
  }
}

export interface TeacherPayrollHistory {
  teacher_id: string
  teacher_name: string
  periods: Array<{
    period_id: string
    period_name: string
    start_date: string
    end_date: string
    pay_date: string
    total_hours: number
    gross_pay: number
    net_pay: number
    pay_stub_id: string
  }>
  totals: {
    total_periods: number
    total_hours: number
    total_gross_pay: number
    total_net_pay: number
    average_hours_per_period: number
    average_pay_per_period: number
  }
}
