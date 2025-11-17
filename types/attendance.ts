// types/attendance.ts
// TypeScript types for the Attendance & Check-In System

/**
 * Attendance status enum
 */
export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'tardy' | 'left_early'

/**
 * Absence type enum
 */
export type AbsenceType = 'planned' | 'unplanned'

/**
 * Absence reason enum
 */
export type AbsenceReason = 'illness' | 'vacation' | 'family_emergency' | 'school_conflict' | 'other'

/**
 * Makeup credit status enum
 */
export type MakeupCreditStatus = 'active' | 'used' | 'expired' | 'cancelled'

/**
 * Makeup booking status enum
 */
export type MakeupBookingStatus = 'booked' | 'attended' | 'cancelled' | 'no_show'

/**
 * Attendance note type enum
 */
export type AttendanceNoteType = 'behavior' | 'progress' | 'concern' | 'achievement' | 'injury' | 'general'

/**
 * Note visibility enum
 */
export type NoteVisibility = 'admin_only' | 'staff_only' | 'teachers' | 'parents'

/**
 * Attendance alert type enum
 */
export type AttendanceAlertType = 'consecutive_absences' | 'low_attendance' | 'excessive_tardiness' | 'custom'

/**
 * Alert severity enum
 */
export type AlertSeverity = 'low' | 'medium' | 'high'

/**
 * Attendance record for a student in a class
 */
export interface Attendance {
  id: string
  student_id: string
  class_instance_id: string
  schedule_class_id?: string
  attendance_date: string
  check_in_time?: string
  check_out_time?: string
  status: AttendanceStatus
  is_makeup: boolean
  original_absence_id?: string
  marked_by?: string
  marked_at: string
  notes?: string
  created_at: string
  updated_at: string
}

/**
 * Extended attendance with related data
 */
export interface AttendanceWithDetails extends Attendance {
  student?: {
    id: string
    first_name: string
    last_name: string
    photo_url?: string
    allergies?: string
    medical_conditions?: string
  }
  class_instance?: {
    id: string
    name: string
    dance_style?: {
      name: string
      color: string
    }
  }
  marked_by_user?: {
    id: string
    first_name: string
    last_name: string
  }
}

/**
 * Absence record
 */
export interface Absence {
  id: string
  student_id: string
  class_instance_id: string
  absence_date: string
  absence_type: AbsenceType
  reason?: AbsenceReason
  reason_notes?: string
  is_excused: boolean
  excused_by?: string
  excused_at?: string
  makeup_credit_granted: boolean
  makeup_credit_id?: string
  reported_by?: string
  reported_at: string
  notification_sent: boolean
  notification_sent_at?: string
  created_at: string
  updated_at: string
}

/**
 * Extended absence with related data
 */
export interface AbsenceWithDetails extends Absence {
  student?: {
    id: string
    first_name: string
    last_name: string
  }
  class_instance?: {
    id: string
    name: string
  }
  makeup_credit?: MakeupCredit
}

/**
 * Makeup credit for a student
 */
export interface MakeupCredit {
  id: string
  student_id: string
  class_instance_id: string
  absence_id?: string
  credits_available: number
  credits_used: number
  granted_date: string
  expiration_date: string
  status: MakeupCreditStatus
  granted_by?: string
  notes?: string
  created_at: string
  updated_at: string
}

/**
 * Extended makeup credit with related data
 */
export interface MakeupCreditWithDetails extends MakeupCredit {
  student?: {
    id: string
    first_name: string
    last_name: string
  }
  class_instance?: {
    id: string
    name: string
    dance_style?: {
      name: string
      color: string
    }
  }
  absence?: Absence
  remaining_credits?: number
}

/**
 * Makeup class booking
 */
export interface MakeupBooking {
  id: string
  makeup_credit_id: string
  student_id: string
  original_class_instance_id: string
  makeup_class_instance_id: string
  makeup_date: string
  status: MakeupBookingStatus
  booked_by?: string
  booked_at: string
  cancelled_by?: string
  cancelled_at?: string
  cancellation_reason?: string
  attendance_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

/**
 * Extended makeup booking with related data
 */
export interface MakeupBookingWithDetails extends MakeupBooking {
  student?: {
    id: string
    first_name: string
    last_name: string
  }
  original_class?: {
    id: string
    name: string
  }
  makeup_class?: {
    id: string
    name: string
    schedule_classes?: Array<{
      day_of_week: number
      start_time: string
      end_time: string
    }>
  }
  makeup_credit?: MakeupCredit
}

/**
 * Attendance note
 */
export interface AttendanceNote {
  id: string
  attendance_id?: string
  student_id: string
  note_type: AttendanceNoteType
  note_text: string
  is_private: boolean
  visibility: NoteVisibility
  created_by: string
  created_at: string
  updated_at: string
}

/**
 * Extended attendance note with related data
 */
export interface AttendanceNoteWithDetails extends AttendanceNote {
  student?: {
    id: string
    first_name: string
    last_name: string
  }
  attendance?: Attendance
  created_by_user?: {
    id: string
    first_name: string
    last_name: string
    user_role: string
  }
}

/**
 * Student QR code for quick check-in
 */
export interface StudentQRCode {
  id: string
  student_id: string
  qr_code_data: string
  qr_code_image_url?: string
  generated_at: string
  last_used_at?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Attendance alert
 */
export interface AttendanceAlert {
  id: string
  student_id: string
  alert_type: AttendanceAlertType
  severity: AlertSeverity
  alert_message: string
  alert_date: string
  date_range_start?: string
  date_range_end?: string
  metrics?: Record<string, any>
  is_acknowledged: boolean
  acknowledged_by?: string
  acknowledged_at?: string
  action_taken?: string
  is_resolved: boolean
  resolved_at?: string
  created_at: string
  updated_at: string
}

/**
 * Extended attendance alert with related data
 */
export interface AttendanceAlertWithDetails extends AttendanceAlert {
  student?: {
    id: string
    first_name: string
    last_name: string
    photo_url?: string
  }
  acknowledged_by_user?: {
    id: string
    first_name: string
    last_name: string
  }
}

/**
 * Student attendance summary (from view)
 */
export interface StudentAttendanceSummary {
  student_id: string
  first_name: string
  last_name: string
  class_instance_id: string
  class_name: string
  total_classes: number
  classes_attended: number
  classes_absent: number
  classes_excused: number
  times_tardy: number
  attendance_percentage: number
}

/**
 * Available makeup credits view
 */
export interface AvailableMakeupCredit {
  student_id: string
  first_name: string
  last_name: string
  class_instance_id: string
  class_name: string
  credit_id: string
  remaining_credits: number
  expiration_date: string
  granted_date: string
  absence_date?: string
  reason?: AbsenceReason
}

/**
 * Daily roster entry for check-in interface
 */
export interface DailyRosterEntry {
  schedule_class_id: string
  day_of_week: number
  start_time: string
  end_time: string
  class_instance_id: string
  class_name: string
  student_id: string
  first_name: string
  last_name: string
  photo_url?: string
  allergies?: string
  medical_conditions?: string
  enrollment_status: string
  attendance_status?: AttendanceStatus
  check_in_time?: string
  check_out_time?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
}

/**
 * Check-in request
 */
export interface CheckInRequest {
  student_id?: string
  qr_code_data?: string
  class_instance_id?: string
  check_in_time?: string
  notes?: string
}

/**
 * Check-out request
 */
export interface CheckOutRequest {
  attendance_id: string
  check_out_time?: string
  notes?: string
}

/**
 * Mark attendance request (for teachers)
 */
export interface MarkAttendanceRequest {
  student_id: string
  class_instance_id: string
  attendance_date: string
  status: AttendanceStatus
  notes?: string
}

/**
 * Report absence request
 */
export interface ReportAbsenceRequest {
  student_id: string
  class_instance_id: string
  absence_date: string
  absence_type: AbsenceType
  reason?: AbsenceReason
  reason_notes?: string
}

/**
 * Excuse absence request
 */
export interface ExcuseAbsenceRequest {
  absence_id: string
  is_excused: boolean
  grant_makeup_credit?: boolean
}

/**
 * Book makeup class request
 */
export interface BookMakeupRequest {
  makeup_credit_id: string
  makeup_class_instance_id: string
  makeup_date: string
  notes?: string
}

/**
 * Cancel makeup booking request
 */
export interface CancelMakeupRequest {
  booking_id: string
  cancellation_reason?: string
}

/**
 * Attendance report filters
 */
export interface AttendanceReportFilters {
  student_id?: string
  class_instance_id?: string
  start_date?: string
  end_date?: string
  status?: AttendanceStatus
  include_makeup?: boolean
}

/**
 * Attendance report data
 */
export interface AttendanceReport {
  filters: AttendanceReportFilters
  summary: {
    total_classes: number
    total_present: number
    total_absent: number
    total_excused: number
    total_tardy: number
    attendance_percentage: number
  }
  records: AttendanceWithDetails[]
  student_summaries?: StudentAttendanceSummary[]
}

/**
 * Attendance statistics for dashboard
 */
export interface AttendanceStats {
  today: {
    total_expected: number
    checked_in: number
    not_checked_in: number
    late: number
  }
  this_week: {
    total_classes: number
    average_attendance_rate: number
    total_absences: number
  }
  alerts: {
    unresolved_count: number
    high_severity_count: number
  }
  makeup_credits: {
    total_active: number
    expiring_soon: number
  }
}

/**
 * Class roster for attendance marking
 */
export interface ClassRoster {
  class_instance_id: string
  class_name: string
  schedule_class_id: string
  class_date: string
  day_of_week: number
  start_time: string
  end_time: string
  teacher_id?: string
  teacher_name?: string
  students: Array<{
    student_id: string
    first_name: string
    last_name: string
    photo_url?: string
    enrollment_status: string
    attendance?: Attendance
    is_makeup_student: boolean
    makeup_booking?: MakeupBooking
  }>
}

/**
 * Form data for creating attendance note
 */
export interface CreateAttendanceNoteForm {
  student_id: string
  attendance_id?: string
  note_type: AttendanceNoteType
  note_text: string
  visibility: NoteVisibility
  is_private: boolean
}

/**
 * Acknowledge alert request
 */
export interface AcknowledgeAlertRequest {
  alert_id: string
  action_taken?: string
}

/**
 * Resolve alert request
 */
export interface ResolveAlertRequest {
  alert_id: string
  action_taken: string
}
