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
  show_id: string
  seat_id: string
  status: 'available' | 'reserved' | 'sold' | 'held'
  price_in_cents: number
  reserved_by: string | null
  reserved_until: string | null
  created_at: string
  updated_at: string

  // Relations
  seat?: Seat

  // Flattened seat details (from API responses)
  row_name?: string
  seat_number?: string
  seat_type?: 'regular' | 'ada' | 'house' | 'blocked'
  section?: string
  section_id?: string
  section_type?: string
  handicap_access?: boolean
  price_zone_id?: string
  price_zone_name?: string
  price_zone_color?: string
}

/**
 * TicketOrder - Customer order for tickets
 */
export interface TicketOrder {
  id: string
  show_id: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  stripe_payment_intent_id: string | null
  total_amount_in_cents: number
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
  order_number: string
  notes: string | null
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
  ticket_order_id: string
  show_seat_id: string
  qr_code: string
  ticket_number: string
  pdf_url: string | null
  pdf_generated_at: string | null
  scanned_at: string | null
  scanned_by: string | null
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
  item_type: 'ticket' | 'digital_download' | 'dvd' | 'merchandise'
  item_name: string
  quantity: number
  price_in_cents: number
  ticket_id: string | null
  created_at: string
}

/**
 * UpsellItem - Additional products/services (programs, photos, etc.)
 */
export interface UpsellItem {
  id: string
  name: string
  description: string | null
  price_in_cents: number
  item_type: 'digital_download' | 'dvd' | 'photo_package' | 'merchandise'
  max_quantity_per_order: number | null
  is_active: boolean
  image_url: string | null
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

/**
 * Seat reservation entity
 */
export interface SeatReservation {
  id: string
  recital_show_id: string
  email: string | null
  phone: string | null
  reservation_token: string
  expires_at: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Reservation seat join table
 */
export interface ReservationSeat {
  id: string
  reservation_id: string
  seat_id: string
  created_at: string
}

/**
 * Reservation details (for API responses)
 */
export interface ReservationDetails {
  id: string
  token: string
  show_id: string
  email: string | null
  phone: string | null
  expires_at: string
  is_active: boolean
  is_expired: boolean
  time_remaining_seconds: number
  created_at: string
  seats: ShowSeat[]
  seat_count: number
  total_amount_in_cents: number
}

/**
 * Reserve seats request
 */
export interface ReserveSeatsRequest {
  show_id: string
  seat_ids: string[]
  email?: string
  phone?: string
}

/**
 * Reserve seats response
 */
export interface ReserveSeatsResponse {
  success: boolean
  message: string
  reservation: {
    id: string
    token: string
    expires_at: string
    seats: ShowSeat[]
    seat_count: number
    total_amount_in_cents: number
  }
}

/**
 * Release reservation request
 */
export interface ReleaseReservationRequest {
  token?: string
  reservation_id?: string
}

/**
 * Release reservation response
 */
export interface ReleaseReservationResponse {
  success: boolean
  message: string
  reservation_id: string
}

/**
 * Check reservation response
 */
export interface CheckReservationResponse {
  success: boolean
  reservation: ReservationDetails
}

/**
 * Checkout & Payment types
 */

/**
 * Customer info for checkout
 */
export interface CustomerInfo {
  name: string
  email: string
  phone?: string
}

/**
 * Create ticket order request
 */
export interface CreateTicketOrderRequest {
  show_id: string
  reservation_token: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  upsell_items?: Array<{
    upsell_item_id: string
    quantity: number
  }>
}

/**
 * Create ticket order response
 */
export interface CreateTicketOrderResponse {
  success: boolean
  order: TicketOrder
  message: string
}

/**
 * Create payment intent request
 */
export interface CreatePaymentIntentRequest {
  order_id: string
}

/**
 * Create payment intent response
 */
export interface CreatePaymentIntentResponse {
  success: boolean
  client_secret: string
  publishable_key: string
  order: TicketOrder
}

/**
 * Confirm payment request
 */
export interface ConfirmPaymentRequest {
  order_id: string
  payment_intent_id: string
}

/**
 * Confirm payment response
 */
export interface ConfirmPaymentResponse {
  success: boolean
  message: string
  order: TicketOrder
  tickets: Ticket[]
}

/**
 * Order summary for display
 */
export interface OrderSummary {
  show_id: string
  show_title: string
  show_date: string
  show_time: string
  venue_name: string
  seats: Array<{
    id: string
    section: string
    row_name: string
    seat_number: string
    price_in_cents: number
  }>
  upsell_items?: Array<{
    name: string
    quantity: number
    price_in_cents: number
    total_price_in_cents: number
  }>
  subtotal_in_cents: number
  fees_in_cents: number
  total_in_cents: number
  seat_count: number
}

/**
 * Webhook payload for Stripe payment events
 */
export interface StripeWebhookPayload {
  type: string
  data: {
    object: {
      id: string
      status: string
      metadata?: Record<string, string>
      amount: number
      currency: string
    }
  }
}

/**
 * Admin order list types
 */

/**
 * Extended order with show and ticket details for admin list
 */
export interface OrderWithDetails extends TicketOrder {
  show?: {
    id: string
    title: string
    show_date: string
    show_time: string
  }
  ticket_count: number
  seat_numbers?: string
}

/**
 * Order filter options for admin
 */
export interface OrderFilters {
  show_id?: string
  status?: TicketOrder['status'] | 'all'
  date_from?: string
  date_to?: string
  search?: string // Search by customer name/email/order number
  page?: number
  limit?: number
  sort_by?: 'created_at' | 'total_amount_in_cents' | 'customer_name'
  sort_order?: 'asc' | 'desc'
}

/**
 * Full order details for admin view
 */
export interface OrderDetails extends TicketOrder {
  show: {
    id: string
    title: string
    show_date: string
    show_time: string
    venue_name: string
  }
  tickets: Array<Ticket & {
    show_seat: ShowSeat & {
      seat: Seat & {
        section?: VenueSection
      }
    }
  }>
  order_items: TicketOrderItem[]
  payment_status: 'pending' | 'succeeded' | 'failed' | 'refunded'
  payment_intent_status?: string
}
