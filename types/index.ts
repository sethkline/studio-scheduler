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
  profile_image_url?: string
  status: 'active' | 'inactive'
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
  studioName: string
  studioId: string
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