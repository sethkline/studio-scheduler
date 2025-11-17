// types/ticketing.ts

/**
 * Venue - Physical location where shows are held
 */
export interface Venue {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  capacity: number | null
  description: string | null
  created_at: string
  updated_at: string

  // Relations (optional, loaded when needed)
  venue_sections?: VenueSection[]
  price_zones?: PriceZone[]
}

/**
 * VenueSection - Logical sections within a venue (Orchestra, Balcony, etc.)
 */
export interface VenueSection {
  id: string
  venue_id: string
  name: string
  display_order: number
  created_at: string
  updated_at: string

  // Relations
  seats?: Seat[]
}

/**
 * PriceZone - Pricing tiers for different areas of venue
 */
export interface PriceZone {
  id: string
  venue_id: string
  name: string
  price_in_cents: number
  color: string | null
  created_at: string
  updated_at: string
}

/**
 * Seat - Individual seat in a venue section
 */
export interface Seat {
  id: string
  venue_id: string
  section_id: string
  row_name: string
  seat_number: string
  seat_type: 'regular' | 'ada' | 'house' | 'blocked'
  price_zone_id: string | null
  is_sellable: boolean
  x_position: number | null
  y_position: number | null
  created_at: string
  updated_at: string

  // Relations
  price_zone?: PriceZone
  section?: VenueSection
}

/**
 * ShowSeat - Seat availability for a specific show
 */
export interface ShowSeat {
  id: string
  recital_show_id: string
  seat_id: string
  status: 'available' | 'reserved' | 'sold' | 'held'
  reserved_until: string | null
  ticket_order_id: string | null
  created_at: string
  updated_at: string

  // Relations
  seat?: Seat
}

/**
 * TicketOrder - Customer order for tickets
 */
export interface TicketOrder {
  id: string
  order_number: string
  recital_show_id: string
  customer_email: string
  customer_name: string
  customer_phone: string | null
  subtotal_in_cents: number
  fees_in_cents: number
  total_in_cents: number
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  payment_intent_id: string | null
  created_at: string
  updated_at: string

  // Relations
  tickets?: Ticket[]
  order_items?: TicketOrderItem[]
}

/**
 * Ticket - Individual ticket within an order
 */
export interface Ticket {
  id: string
  ticket_number: string
  ticket_order_id: string
  show_seat_id: string
  qr_code: string
  status: 'valid' | 'used' | 'refunded'
  scanned_at: string | null
  created_at: string
  updated_at: string

  // Relations
  show_seat?: ShowSeat
}

/**
 * TicketOrderItem - Line items in an order (tickets + upsells)
 */
export interface TicketOrderItem {
  id: string
  ticket_order_id: string
  item_type: 'ticket' | 'upsell'
  ticket_id: string | null
  upsell_item_id: string | null
  quantity: number
  price_in_cents: number
  created_at: string
  updated_at: string
}

/**
 * UpsellItem - Additional products/services (programs, photos, etc.)
 */
export interface UpsellItem {
  id: string
  recital_show_id: string | null
  name: string
  description: string | null
  price_in_cents: number
  item_type: 'physical' | 'digital'
  max_quantity_per_order: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Input types for API requests
 */
export interface CreateVenueInput {
  name: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  capacity?: number
  description?: string
}

export interface UpdateVenueInput {
  name?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  capacity?: number
  description?: string
}

export interface CreateVenueSectionInput {
  venue_id: string
  name: string
  display_order?: number
}

export interface CreatePriceZoneInput {
  venue_id: string
  name: string
  price_in_cents: number
  color?: string
}

/**
 * Seat availability statistics
 */
export interface SeatAvailabilityStats {
  total_seats: number
  available_seats: number
  reserved_seats: number
  sold_seats: number
  held_seats: number
}

/**
 * Seat map builder types
 */

/**
 * Tool types for the seat map builder
 */
export type BuilderTool = 'select' | 'add-row' | 'add-seat' | 'delete' | 'pan'

/**
 * Seat node for the visual editor
 */
export interface SeatNode extends Seat {
  // Visual state
  isSelected?: boolean
  isDragging?: boolean
}

/**
 * Row template for bulk seat creation
 */
export interface RowTemplate {
  row_name: string
  section_id: string
  seat_count: number
  start_number: number
  y_position: number
  x_start: number
  seat_spacing: number
  price_zone_id: string | null
  seat_type: 'regular' | 'ada' | 'house' | 'blocked'
}

/**
 * Bulk seat creation input
 */
export interface BulkCreateSeatsInput {
  venue_id: string
  seats: CreateSeatInput[]
}

/**
 * Single seat creation input
 */
export interface CreateSeatInput {
  venue_id: string
  section_id: string
  row_name: string
  seat_number: string
  seat_type: 'regular' | 'ada' | 'house' | 'blocked'
  price_zone_id: string | null
  is_sellable: boolean
  x_position: number | null
  y_position: number | null
}

/**
 * Seat update input
 */
export interface UpdateSeatInput {
  row_name?: string
  seat_number?: string
  seat_type?: 'regular' | 'ada' | 'house' | 'blocked'
  price_zone_id?: string | null
  is_sellable?: boolean
  x_position?: number | null
  y_position?: number | null
}

/**
 * Canvas viewport state
 */
export interface ViewportState {
  scale: number
  offsetX: number
  offsetY: number
}

/**
 * History action for undo/redo
 */
export interface HistoryAction {
  type: 'create' | 'update' | 'delete' | 'bulk-create'
  timestamp: number
  data: any
}

/**
 * Seat map data structure
 */
export interface SeatMapData {
  venue_id: string
  sections: VenueSection[]
  price_zones: PriceZone[]
  seats: Seat[]
}
