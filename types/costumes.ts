// Costume Management Types

export type CostumeType = 'dress' | 'outfit' | 'shoes' | 'accessory' | 'headpiece'
export type CostumeStatus = 'active' | 'inactive' | 'retired'
export type AssignmentStatus = 'assigned' | 'picked_up' | 'returned' | 'missing'

export interface Costume {
  id: string
  name: string
  description?: string
  costume_type?: CostumeType
  sizes_available?: string[] // ['XS', 'S', 'M', 'L', 'XL']
  quantity_in_stock: number
  rental_price_cents?: number
  notes?: string
  status: CostumeStatus
  created_at: string
  updated_at: string
}

export interface CostumeAssignment {
  id: string
  student_id: string
  costume_id: string
  recital_performance_id?: string
  size_assigned: string
  assigned_date: string
  due_date?: string
  status: AssignmentStatus
  notes?: string
  created_at: string
  updated_at: string
}

export interface CostumePickup {
  id: string
  assignment_id: string
  guardian_id?: string
  picked_up_by?: string
  picked_up_at?: string
  returned_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Extended types with relationships
export interface CostumeAssignmentWithDetails extends CostumeAssignment {
  costume?: Costume
  student?: {
    id: string
    first_name: string
    last_name: string
  }
  recital_performance?: {
    id: string
    title: string
  }
  pickup?: CostumePickup
}

export interface CostumeWithAssignments extends Costume {
  assignments?: CostumeAssignment[]
  available_quantity?: number
}

// Form types
export interface CreateCostumeForm {
  name: string
  description?: string
  costume_type?: CostumeType
  sizes_available?: string[]
  quantity_in_stock: number
  rental_price_cents?: number
  notes?: string
}

export interface AssignCostumeForm {
  student_id: string
  costume_id: string
  recital_performance_id?: string
  size_assigned: string
  due_date?: string
  notes?: string
}

export interface RecordPickupForm {
  assignment_id: string
  guardian_id?: string
  picked_up_by: string
  notes?: string
}

// Distribution report types
export interface DistributionStatusSummary {
  total_assignments: number
  assigned: number
  picked_up: number
  returned: number
  missing: number
  pending_pickup: number
}

export interface DistributionReportItem {
  assignment_id: string
  student_name: string
  costume_name: string
  size: string
  status: AssignmentStatus
  assigned_date: string
  due_date?: string
  picked_up_at?: string
  returned_at?: string
  guardian_name?: string
}
