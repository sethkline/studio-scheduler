// types/choreography.ts
// Choreography Notes Feature Types - Story 5.3.4

export interface DancerPosition {
  name: string
  position: {
    x: number // Stage position X coordinate (0-100, percentage)
    y: number // Stage position Y coordinate (0-100, percentage)
  }
  notes?: string
  studentId?: string // Optional link to student record
}

export interface FormationData {
  dancers: DancerPosition[]
  stageNotes?: string // Additional notes about the formation
  timing?: string // When this formation occurs (e.g., "Measure 8-16")
}

export interface ChoreographyNote {
  id: string
  class_instance_id: string
  teacher_id: string
  title: string
  description?: string
  notes?: string // Detailed choreography notes with counts
  music_title?: string
  music_artist?: string
  music_link?: string // URL to music (Spotify, YouTube, etc.)
  video_url?: string // Supabase Storage URL for uploaded video
  video_thumbnail_url?: string
  counts_notation?: string // Structured counts notation
  is_active: boolean
  version: number
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  // Related data (populated via joins)
  class_instance?: {
    id: string
    name?: string
    class_definition?: {
      id: string
      name: string
      dance_style?: {
        name: string
        color: string
      }
    }
  }
  teacher?: {
    id: string
    first_name: string
    last_name: string
  }
  formations?: ChoreographyFormation[]
}

export interface ChoreographyFormation {
  id: string
  choreography_note_id: string
  formation_name: string
  formation_order: number
  formation_data?: FormationData // JSON stored as object
  stage_diagram_url?: string // Optional uploaded diagram
  notes?: string
  created_at: string
  updated_at: string
}

export interface ChoreographyVersion {
  id: string
  choreography_note_id: string
  version: number
  title: string
  description?: string
  notes?: string
  music_title?: string
  music_artist?: string
  music_link?: string
  video_url?: string
  counts_notation?: string
  formations_snapshot?: ChoreographyFormation[] // Snapshot of formations at this version
  change_summary?: string
  created_at: string
  created_by?: string
}

// Form/Input types
export interface ChoreographyNoteInput {
  class_instance_id: string
  teacher_id: string
  title: string
  description?: string
  notes?: string
  music_title?: string
  music_artist?: string
  music_link?: string
  counts_notation?: string
}

export interface ChoreographyFormationInput {
  choreography_note_id: string
  formation_name: string
  formation_order: number
  formation_data?: FormationData
  notes?: string
}

// API Response types
export interface ChoreographyNotesResponse {
  choreography_notes: ChoreographyNote[]
  total: number
}

export interface ChoreographyNoteDetailResponse {
  choreography_note: ChoreographyNote
  formations: ChoreographyFormation[]
  versions: ChoreographyVersion[]
}

// Video upload types
export interface VideoUploadProgress {
  progress: number // 0-100
  status: 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
}
