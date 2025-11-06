// Media Gallery Types

export type MediaType = 'photo' | 'video'
export type MediaVisibility = 'public' | 'students_only' | 'private'

export interface MediaItem {
  id: string
  title: string
  description?: string
  media_type: MediaType
  file_path: string
  thumbnail_path?: string
  file_size_bytes?: number
  mime_type?: string
  width?: number
  height?: number
  duration_seconds?: number
  recital_id?: string
  class_instance_id?: string
  event_date?: string
  visibility: MediaVisibility
  uploaded_by?: string
  upload_date: string
  download_count: number
  created_at: string
  updated_at: string
}

export interface MediaStudentTag {
  id: string
  media_item_id: string
  student_id: string
  tagged_by?: string
  tagged_at: string
  created_at: string
}

export interface MediaDownload {
  id: string
  media_item_id: string
  downloaded_by?: string
  guardian_id?: string
  downloaded_at: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

// Extended types with relationships

export interface MediaItemWithDetails extends MediaItem {
  recital?: {
    id: string
    name: string
  }
  class_instance?: {
    id: string
    name: string
  }
  uploaded_by_user?: {
    id: string
    first_name: string
    last_name: string
  }
  student_tags?: MediaStudentTagWithStudent[]
  download_url?: string
  thumbnail_url?: string
}

export interface MediaStudentTagWithStudent extends MediaStudentTag {
  student?: {
    id: string
    first_name: string
    last_name: string
  }
}

export interface MediaStudentTagWithMedia extends MediaStudentTag {
  media_item?: MediaItem
}

// Form types

export interface UploadMediaForm {
  title: string
  description?: string
  media_type: MediaType
  file: File
  recital_id?: string
  class_instance_id?: string
  event_date?: string
  visibility: MediaVisibility
  student_ids?: string[]
}

export interface UpdateMediaForm {
  title?: string
  description?: string
  visibility?: MediaVisibility
  recital_id?: string
  class_instance_id?: string
  event_date?: string
}

export interface TagStudentsForm {
  media_item_id: string
  student_ids: string[]
}

// Summary/Report types

export interface MediaGallerySummary {
  total_items: number
  total_photos: number
  total_videos: number
  total_size_bytes: number
  total_downloads: number
  recent_uploads: MediaItemWithDetails[]
}

export interface MediaFilterOptions {
  media_type?: MediaType
  recital_id?: string
  class_instance_id?: string
  student_id?: string
  start_date?: string
  end_date?: string
  visibility?: MediaVisibility
}

// Supabase Storage types

export interface StorageUploadResponse {
  path: string
  fullPath: string
  id: string
}

export interface MediaUploadProgress {
  file_name: string
  progress: number
  uploaded: boolean
  error?: string
}
