export interface StudioTheme {
  primary_color?: string
  secondary_color?: string
  accent_color?: string
}

export interface StudioProfile {
  id: string
  name: string
  description?: string
  logo_url?: string
  email?: string
  phone?: string
  website?: string
  social_media?: Record<string, string>
  address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  tax_id?: string
  theme?: StudioTheme
  created_at: string
  updated_at: string
}

export interface StudioLocation {
  id: string
  name: string
  address: string
  city: string
  state: string
  postal_code: string
  country?: string
  phone?: string
  email?: string
  description?: string
  capacity?: number
  is_active: boolean
  created_at: string
  updated_at: string
  rooms?: StudioRoom[]
  operatingHours?: OperatingHour[]
  specialHours?: SpecialOperatingHour[]
}

export interface StudioRoom {
  id: string
  location_id: string
  name: string
  description?: string
  capacity?: number
  area_sqft?: number
  features?: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OperatingHour {
  id: string
  location_id: string
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
  created_at: string
  updated_at: string
}

export interface SpecialOperatingHour {
  id: string
  location_id: string
  date: string
  open_time?: string
  close_time?: string
  is_closed: boolean
  description?: string
  created_at: string
  updated_at: string
}

export interface OperatingHourUpdateRequest {
  locationId: string
  hours: {
    dayOfWeek: number
    openTime?: string
    closeTime?: string
    isClosed: boolean
  }[]
}

export interface SpecialHourRequest {
  locationId: string
  date: string
  openTime?: string
  closeTime?: string
  isClosed: boolean
  description?: string
}