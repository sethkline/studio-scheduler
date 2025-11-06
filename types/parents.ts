// types/parents.ts

/**
 * Guardian/Parent account
 * Linked to auth user and can have multiple students
 */
export interface Guardian {
  id: string
  user_id: string                     // Link to auth.users and profiles
  first_name: string
  last_name: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  profile_image_url?: string
  emergency_contact: boolean          // Can be used as emergency contact
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

/**
 * Enhanced student profile with all necessary information
 */
export interface StudentProfile {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say'
  photo_url?: string

  // Contact Information
  email?: string
  phone?: string

  // Medical Information
  allergies?: string
  medical_conditions?: string
  medications?: string
  doctor_name?: string
  doctor_phone?: string

  // Emergency Contact (can be different from guardian)
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relationship?: string

  // Costume Information
  costume_size_top?: string           // XS, S, M, L, XL, etc.
  costume_size_bottom?: string
  shoe_size?: string
  height_inches?: number

  // Other
  notes?: string
  status: 'active' | 'inactive' | 'on_hold'
  created_at: string
  updated_at: string
}

/**
 * Relationship between guardian and student
 */
export interface StudentGuardianRelationship {
  id: string
  student_id: string
  guardian_id: string
  relationship: 'parent' | 'legal_guardian' | 'grandparent' | 'aunt_uncle' | 'sibling' | 'other'
  relationship_custom?: string        // If relationship is 'other'
  primary_contact: boolean            // Primary contact for this student
  authorized_pickup: boolean          // Authorized to pick up student
  financial_responsibility: boolean   // Responsible for payments
  can_authorize_medical: boolean      // Can authorize emergency medical treatment
  created_at: string
  updated_at: string
}

/**
 * Extended student profile with guardian information
 */
export interface StudentWithGuardians extends StudentProfile {
  guardians?: GuardianRelationship[]
}

/**
 * Guardian with relationship details
 */
export interface GuardianRelationship extends Guardian {
  relationship?: StudentGuardianRelationship
}

/**
 * Extended guardian profile with students
 */
export interface GuardianWithStudents extends Guardian {
  students?: StudentWithRelationship[]
}

/**
 * Student with relationship details
 */
export interface StudentWithRelationship extends StudentProfile {
  relationship?: StudentGuardianRelationship
}

/**
 * Form data for adding a new student
 */
export interface AddStudentForm {
  // Basic Info
  first_name: string
  last_name: string
  date_of_birth: string
  gender?: string
  photo_url?: string

  // Contact
  email?: string
  phone?: string

  // Medical
  allergies?: string
  medical_conditions?: string
  medications?: string
  doctor_name?: string
  doctor_phone?: string

  // Emergency Contact
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relationship?: string

  // Costume Sizing
  costume_size_top?: string
  costume_size_bottom?: string
  shoe_size?: string
  height_inches?: number

  // Relationship to guardian
  relationship: string
  relationship_custom?: string
  primary_contact: boolean
  authorized_pickup: boolean
  financial_responsibility: boolean
  can_authorize_medical: boolean

  notes?: string
}

/**
 * Parent dashboard statistics
 */
export interface ParentDashboardStats {
  total_students: number
  active_enrollments: number
  upcoming_recitals: number
  pending_payments: number
  outstanding_costumes: number
  required_volunteer_hours: number
  completed_volunteer_hours: number
}

/**
 * Combined schedule event for parent view
 */
export interface ParentScheduleEvent {
  id: string
  student_id: string
  student_name: string
  class_name: string
  class_instance_id: string
  day_of_week: number
  start_time: string
  end_time: string
  location?: string
  teacher_name?: string
  dance_style?: string
  dance_style_color?: string
}

/**
 * Enrollment request from parent
 */
export interface EnrollmentRequest {
  id: string
  student_id: string
  class_instance_id: string
  guardian_id: string
  status: 'pending' | 'approved' | 'denied' | 'waitlist'
  requested_at: string
  processed_at?: string
  processed_by?: string
  notes?: string
  created_at: string
  updated_at: string
}

/**
 * Parent notification preferences
 */
export interface ParentNotificationPreferences {
  id: string
  guardian_id: string
  email_notifications: boolean
  sms_notifications: boolean
  notify_enrollment_updates: boolean
  notify_schedule_changes: boolean
  notify_upcoming_classes: boolean
  notify_recital_updates: boolean
  notify_payment_due: boolean
  notify_costume_updates: boolean
  notify_volunteer_reminders: boolean
  created_at: string
  updated_at: string
}
