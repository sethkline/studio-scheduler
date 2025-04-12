import type {ClassDefinition, Teacher } from './index'
export interface Recital {
  id: string;
  name: string;
  description?: string;
  date: string;
  location: string;
  notes?: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  theme?: string;
  program_notes?: string;
  created_at: string;
  updated_at: string;
  has_program?: boolean;
}

export interface RecitalSeries {
  id: string
  name: string
  description?: string
  theme?: string
  year: number
  season?: string
  created_at: string
  updated_at: string
}

export interface RecitalShow {
  id: string
  series_id: string
  name: string
  description?: string
  date: string
  start_time: string
  end_time?: string
  location?: string
  notes?: string
  status: 'planning' | 'rehearsal' | 'ready' | 'completed' | 'cancelled'
  volunteer_tickets_start_at?: string
  senior_tickets_start_at?: string
  general_tickets_start_at?: string
  created_at: string
  updated_at: string
  series?: RecitalSeries
  program?: RecitalProgram
}

export interface RecitalProgram {
  id: string
  recital_show_id: string
  cover_image_url?: string
  artistic_director_note?: string
  acknowledgments?: string
  created_at: string
  updated_at: string
}

export interface RecitalPerformance {
  id: string
  recital_id: string  // References recital_show.id
  class_instance_id: string
  performance_order: number
  song_title?: string
  song_artist?: string
  duration?: number
  notes?: string
  choreographer?: string
  created_at: string
  updated_at: string
  class_instance?: ClassInstance
}

export interface RecitalProgramAdvertisement {
  id: string
  recital_program_id: string
  title: string
  description?: string
  image_url?: string
  order_position: number
  created_at: string
  updated_at: string
}

// Update ClassInstance and other related interfaces if needed
export interface ClassInstance {
  id: string
  class_definition_id: string
  name?: string
  teacher_id?: string
  studio_id?: string
  status?: string
  created_at: string
  updated_at: string
  class_definition?: ClassDefinition
  teacher?: Teacher
}

export interface RecitalProgram {
  id: string;
  recital_id: string;
  cover_image_url?: string;
  artistic_director_note?: string;
  acknowledgments?: string;
  created_at: string;
  updated_at: string;
}



export interface ProgramData {
  recital: Recital;
  program: RecitalProgram | null;
  performances: RecitalPerformance[];
  advertisements: RecitalProgramAdvertisement[];
}