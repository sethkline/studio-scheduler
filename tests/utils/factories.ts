/**
 * Test data factories for creating mock data in tests
 */

import type {
  Venue,
  VenueSection,
  PriceZone,
  Seat,
  ShowSeat,
  TicketOrder,
  Ticket
} from '~/types/ticketing'

let idCounter = 1

export function generateId(prefix = 'test') {
  return `${prefix}-${Date.now()}-${idCounter++}`
}

/**
 * Create a test venue
 */
export function createTestVenue(overrides: Partial<Venue> = {}): Venue {
  const id = generateId('venue')
  return {
    id,
    name: 'Test Venue',
    address: '123 Main St',
    city: 'Testville',
    state: 'CA',
    zip_code: '12345',
    capacity: 500,
    description: 'A test venue for testing',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Create a test venue section
 */
export function createTestSection(venueId: string, overrides: Partial<VenueSection> = {}): VenueSection {
  const id = generateId('section')
  return {
    id,
    venue_id: venueId,
    name: 'Orchestra',
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Create a test price zone
 */
export function createTestPriceZone(venueId: string, overrides: Partial<PriceZone> = {}): PriceZone {
  const id = generateId('zone')
  return {
    id,
    venue_id: venueId,
    name: 'General Admission',
    price_in_cents: 2500,
    color: '#3B82F6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Create a test seat
 */
export function createTestSeat(
  venueId: string,
  sectionId: string,
  priceZoneId: string,
  overrides: Partial<Seat> = {}
): Seat {
  const id = generateId('seat')
  return {
    id,
    venue_id: venueId,
    section_id: sectionId,
    price_zone_id: priceZoneId,
    seat_number: 'A1',
    row_name: 'A',
    seat_type: 'regular',
    is_sellable: true,
    x_position: 100,
    y_position: 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Create multiple test seats in a grid pattern
 */
export function createTestSeats(
  venueId: string,
  sectionId: string,
  priceZoneId: string,
  rows: number,
  seatsPerRow: number
): Seat[] {
  const seats: Seat[] = []
  const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  for (let r = 0; r < rows; r++) {
    const rowName = rowLetters[r] || `Row${r + 1}`
    for (let s = 0; s < seatsPerRow; s++) {
      const seatNumber = s + 1
      seats.push(
        createTestSeat(venueId, sectionId, priceZoneId, {
          seat_number: `${rowName}${seatNumber}`,
          row_name: rowName,
          x_position: s * 50 + 50,
          y_position: r * 50 + 50
        })
      )
    }
  }

  return seats
}

/**
 * Create a test recital show
 */
export function createTestShow(overrides: any = {}) {
  const id = generateId('show')
  return {
    id,
    name: 'Spring Recital - Show 1',
    recital_series_id: generateId('series'),
    show_date: '2025-06-15',
    show_time: '19:00:00',
    doors_open_time: '18:30:00',
    venue_id: null,
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Create a test show seat
 */
export function createTestShowSeat(
  showId: string,
  seatId: string,
  overrides: Partial<ShowSeat> = {}
): ShowSeat {
  const id = generateId('show-seat')
  return {
    id,
    show_id: showId,
    seat_id: seatId,
    status: 'available',
    price_in_cents: 2500,
    reserved_by: null,
    reserved_until: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Flattened fields
    row_name: 'A',
    seat_number: 'A1',
    seat_type: 'regular',
    section: 'Orchestra',
    ...overrides
  }
}

/**
 * Create a test ticket order
 */
export function createTestOrder(overrides: Partial<TicketOrder> = {}): TicketOrder {
  const id = generateId('order')
  const orderNumber = `ORD-${Date.now()}`

  return {
    id,
    order_number: orderNumber,
    show_id: generateId('show'),
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    customer_phone: '555-1234',
    total_amount_in_cents: 5000,
    status: 'pending',
    stripe_payment_intent_id: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Create a test ticket
 */
export function createTestTicket(orderId: string, showSeatId: string, overrides: Partial<Ticket> = {}): Ticket {
  const id = generateId('ticket')
  const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

  return {
    id,
    ticket_order_id: orderId,
    show_seat_id: showSeatId,
    ticket_number: ticketNumber,
    qr_code: `TKT-${Math.random().toString(36).substr(2, 12).toUpperCase()}-${Date.now()}`,
    pdf_url: null,
    pdf_generated_at: null,
    scanned_at: null,
    scanned_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Create a test reservation
 */
export function createTestReservation(overrides: any = {}) {
  const id = generateId('reservation')
  const token = `RES-${Math.random().toString(36).substr(2, 16).toUpperCase()}`

  return {
    id,
    token,
    show_id: generateId('show'),
    seat_ids: [],
    session_id: 'test-session-id',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Create a complete venue setup with sections, zones, and seats
 */
export function createCompleteVenueSetup() {
  const venue = createTestVenue()

  const orchestraSection = createTestSection(venue.id, {
    name: 'Orchestra',
    display_order: 1
  })

  const balconySection = createTestSection(venue.id, {
    name: 'Balcony',
    display_order: 2
  })

  const premiumZone = createTestPriceZone(venue.id, {
    name: 'Premium',
    price_in_cents: 5000,
    color: '#10B981'
  })

  const generalZone = createTestPriceZone(venue.id, {
    name: 'General',
    price_in_cents: 2500,
    color: '#3B82F6'
  })

  const orchestraSeats = createTestSeats(venue.id, orchestraSection.id, premiumZone.id, 5, 10)
  const balconySeats = createTestSeats(venue.id, balconySection.id, generalZone.id, 3, 8)

  return {
    venue,
    sections: [orchestraSection, balconySection],
    priceZones: [premiumZone, generalZone],
    seats: [...orchestraSeats, ...balconySeats]
  }
}

/**
 * Create a complete purchase flow scenario
 */
export function createPurchaseFlowScenario() {
  const { venue, sections, priceZones, seats } = createCompleteVenueSetup()
  const show = createTestShow({ venue_id: venue.id })

  const showSeats = seats.slice(0, 10).map(seat =>
    createTestShowSeat(show.id, seat.id, {
      seat_number: seat.seat_number,
      row_name: seat.row_name,
      section: sections.find(s => s.id === seat.section_id)?.name || 'Unknown',
      price_in_cents: priceZones.find(z => z.id === seat.price_zone_id)?.price_in_cents || 0
    })
  )

  const selectedSeats = showSeats.slice(0, 2)
  const totalAmount = selectedSeats.reduce((sum, seat) => sum + seat.price_in_cents, 0)

  const order = createTestOrder({
    show_id: show.id,
    total_amount_in_cents: totalAmount,
    status: 'paid'
  })

  const tickets = selectedSeats.map(seat =>
    createTestTicket(order.id, seat.id)
  )

  return {
    venue,
    sections,
    priceZones,
    seats,
    show,
    showSeats,
    selectedSeats,
    order,
    tickets
  }
}
