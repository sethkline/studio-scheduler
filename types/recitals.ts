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

export interface RecitalProgram {
  id: string;
  recital_id: string;
  cover_image_url?: string;
  artistic_director_note?: string;
  acknowledgments?: string;
  created_at: string;
  updated_at: string;
}

export interface RecitalPerformance {
  id: string;
  recital_id: string;
  class_instance_id: string;
  performance_order: number;
  song_title?: string;
  song_artist?: string;
  duration?: number;
  notes?: string;
  choreographer?: string;
  created_at: string;
  updated_at: string;
  class_instance?: {
    id: string;
    name: string;
    class_definition?: {
      id: string;
      name: string;
      dance_style?: {
        id: string;
        name: string;
        color: string;
      }
    }
  }
}

export interface RecitalProgramAdvertisement {
  id: string;
  recital_program_id: string;
  title: string;
  description?: string;
  image_url?: string;
  order_position: number;
  created_at: string;
  updated_at: string;
}

export interface ProgramData {
  recital: Recital;
  program: RecitalProgram | null;
  performances: RecitalPerformance[];
  advertisements: RecitalProgramAdvertisement[];
}