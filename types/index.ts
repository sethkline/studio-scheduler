// types/index.ts
export interface Student {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  email?: string
  phone?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  notes?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Teacher {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  bio?: string
  specialties?: any[]
  profile_image_url?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface TeacherAvailability {
  id: string
  teacher_id: string
  day_of_week: number
  start_time: string
  end_time: string
  recurring: boolean
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface TeacherAvailabilityException {
  id: string
  teacher_id: string
  exception_date: string
  start_time?: string
  end_time?: string
  is_available: boolean
  reason?: string
  created_at: string
  updated_at: string
}

export interface ClassDefinition {
  id: string
  name: string
  dance_style_id?: string
  class_level_id?: string
  min_age?: number
  max_age?: number
  description?: string
  duration: number
  max_students?: number
  created_at: string
  updated_at: string
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

export interface ScheduleClass {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  classInstanceId: string
  className: string
  teacherName: string
  danceStyle: string
  danceStyleColor: string
  studioId: string
  studioName?: string
}

export interface Schedule {
  id: string
  name: string
  description?: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Pagination {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}