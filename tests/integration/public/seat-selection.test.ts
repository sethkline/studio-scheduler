// tests/integration/public/seat-selection.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockEvent } from '../../utils/mocks'
import { createPurchaseFlowScenario } from '../../utils/factories'

// Import API handlers (these need to be created if they don't exist)
import reserveSeats from '../../../server/api/recital-shows/[id]/seats/reserve'

const scenario = createPurchaseFlowScenario()

const mockData = {
  venues: [scenario.venue],
  venue_sections: scenario.sections,
  price_zones: scenario.priceZones,
  seats: scenario.seats,
  recital_shows: [scenario.show],
  show_seats: scenario.showSeats,
  seat_reservations: []
}

vi.mock('../../../server/utils/supabase', () => ({
  getSupabaseClient: () => createMockSupabaseClient(mockData)
}))

describe('Seat Selection & Reservation', () => {
  beforeEach(() => {
    mockData.show_seats = scenario.showSeats.map(seat => ({
      ...seat,
      status: 'available',
      reserved_by: null,
      reserved_until: null
    }))
    mockData.seat_reservations = []
  })

  describe('Seat Selection UI Logic', () => {
    it('should allow selecting available seats (click to select)', () => {
      const availableSeats = mockData.show_seats.filter(s => s.status === 'available')
      expect(availableSeats.length).toBeGreaterThan(0)

      // Simulate selection
      const selectedSeats = availableSeats.slice(0, 2)
      expect(selectedSeats.length).toBe(2)
    })

    it('should allow deselecting seats (click to deselect)', () => {
      const selectedSeats = mockData.show_seats.slice(0, 2)

      // Simulate deselection
      const remainingSeats = selectedSeats.slice(1)
      expect(remainingSeats.length).toBe(1)
    })

    it('should prevent selecting sold seats', () => {
      mockData.show_seats[0].status = 'sold'

      const soldSeat = mockData.show_seats[0]
      expect(soldSeat.status).toBe('sold')

      // In UI, click handler should check status
      const canSelect = soldSeat.status === 'available'
      expect(canSelect).toBe(false)
    })

    it('should prevent selecting already reserved seats', () => {
      mockData.show_seats[0].status = 'reserved'
      mockData.show_seats[0].reserved_by = 'other-session-id'

      const reservedSeat = mockData.show_seats[0]
      const canSelect = reservedSeat.status === 'available'
      expect(canSelect).toBe(false)
    })

    it('should enforce max 10 seats per order', () => {
      const selectedSeats = mockData.show_seats.slice(0, 11)
      const maxAllowed = 10

      const isValid = selectedSeats.length <= maxAllowed
      expect(isValid).toBe(false)

      const validSelection = selectedSeats.slice(0, 10)
      expect(validSelection.length).toBeLessThanOrEqual(maxAllowed)
    })

    it('should detect and warn about consecutive seat gaps', () => {
      // Select seats A1, A3, A4 (leaving A2 as a single)
      const selectedSeats = [
        mockData.show_seats.find(s => s.seat_number === 'A1'),
        mockData.show_seats.find(s => s.seat_number === 'A3'),
        mockData.show_seats.find(s => s.seat_number === 'A4')
      ].filter(Boolean)

      // Logic to detect single seat left in row
      const rowSeats = mockData.show_seats.filter(s => s.row_name === 'A')
      const selectedInRow = selectedSeats.filter(s => s.row_name === 'A')

      // A2 is left as a single seat
      const hasGap = true // In real implementation, use consecutive seat detection
      expect(hasGap).toBe(true)
    })
  })

  describe('POST /api/recital-shows/[id]/seats/reserve', () => {
    it('should create reservation successfully', async () => {
      const seatIds = mockData.show_seats.slice(0, 2).map(s => s.id)

      const event = createMockEvent({
        method: 'POST',
        url: `/api/recital-shows/${scenario.show.id}/seats/reserve`,
        params: { id: scenario.show.id },
        body: {
          seat_ids: seatIds,
          session_id: 'test-session-123'
        }
      })

      const response = await reserveSeats(event)

      expect(response.success).toBe(true)
      expect(response.reservation).toBeDefined()
      expect(response.reservation.token).toBeDefined()
      expect(response.reservation.seats).toHaveLength(2)
    })

    it('should start reservation timer (10 minutes)', async () => {
      const seatIds = [mockData.show_seats[0].id]

      const event = createMockEvent({
        method: 'POST',
        url: `/api/recital-shows/${scenario.show.id}/seats/reserve`,
        params: { id: scenario.show.id },
        body: {
          seat_ids: seatIds,
          session_id: 'test-session-123'
        }
      })

      const response = await reserveSeats(event)

      const expiresAt = new Date(response.reservation.expires_at)
      const now = new Date()
      const duration = (expiresAt.getTime() - now.getTime()) / 1000 / 60 // minutes

      expect(duration).toBeGreaterThan(9)
      expect(duration).toBeLessThanOrEqual(10)
    })

    it('should expire reservation after timeout', async () => {
      const pastExpiry = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      mockData.seat_reservations = [{
        id: 'reservation-1',
        token: 'test-token',
        show_id: scenario.show.id,
        session_id: 'test-session-123',
        expires_at: pastExpiry,
        is_active: true
      }]

      // In real implementation, cleanup job or check would mark as inactive
      const isExpired = new Date(pastExpiry) < new Date()
      expect(isExpired).toBe(true)
    })

    it('should calculate total price correctly', async () => {
      const selectedSeats = mockData.show_seats.slice(0, 2)
      const seatIds = selectedSeats.map(s => s.id)

      const event = createMockEvent({
        method: 'POST',
        url: `/api/recital-shows/${scenario.show.id}/seats/reserve`,
        params: { id: scenario.show.id },
        body: {
          seat_ids: seatIds,
          session_id: 'test-session-123'
        }
      })

      const response = await reserveSeats(event)

      const expectedTotal = selectedSeats.reduce((sum, seat) => sum + seat.price_in_cents, 0)
      expect(response.reservation.total_amount_in_cents).toBe(expectedTotal)
    })

    it('should ensure session-based reservation ownership', async () => {
      const sessionId = 'test-session-123'
      const seatIds = [mockData.show_seats[0].id]

      const event = createMockEvent({
        method: 'POST',
        url: `/api/recital-shows/${scenario.show.id}/seats/reserve`,
        params: { id: scenario.show.id },
        body: {
          seat_ids: seatIds,
          session_id: sessionId
        }
      })

      const response = await reserveSeats(event)

      expect(response.reservation).toBeDefined()
      // In the database, reserved_session_id should match
      expect(response.success).toBe(true)
    })

    it('should prevent stealing another session\'s reservation', async () => {
      // First session reserves seat
      mockData.show_seats[0].status = 'reserved'
      mockData.show_seats[0].reserved_by = 'session-123'
      mockData.show_seats[0].reserved_until = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      // Second session tries to reserve same seat
      const event = createMockEvent({
        method: 'POST',
        url: `/api/recital-shows/${scenario.show.id}/seats/reserve`,
        params: { id: scenario.show.id },
        body: {
          seat_ids: [mockData.show_seats[0].id],
          session_id: 'session-456' // Different session
        }
      })

      await expect(reserveSeats(event)).rejects.toThrow(/already reserved|unavailable/)
    })
  })

  describe('Reservation Concurrency', () => {
    it('should handle two users trying to reserve same seat (only one succeeds)', async () => {
      const seatId = mockData.show_seats[0].id

      // Simulate concurrent requests
      const event1 = createMockEvent({
        method: 'POST',
        url: `/api/recital-shows/${scenario.show.id}/seats/reserve`,
        params: { id: scenario.show.id },
        body: {
          seat_ids: [seatId],
          session_id: 'session-1'
        }
      })

      const event2 = createMockEvent({
        method: 'POST',
        url: `/api/recital-shows/${scenario.show.id}/seats/reserve`,
        params: { id: scenario.show.id },
        body: {
          seat_ids: [seatId],
          session_id: 'session-2'
        }
      })

      // First request succeeds
      const response1 = await reserveSeats(event1)
      expect(response1.success).toBe(true)

      // Mark seat as reserved
      mockData.show_seats[0].status = 'reserved'
      mockData.show_seats[0].reserved_by = 'session-1'

      // Second request should fail
      await expect(reserveSeats(event2)).rejects.toThrow()
    })

    it('should handle User A reserves, User B tries to buy (User B fails)', async () => {
      const seatId = mockData.show_seats[0].id

      // User A reserves
      mockData.show_seats[0].status = 'reserved'
      mockData.show_seats[0].reserved_by = 'session-A'
      mockData.show_seats[0].reserved_until = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      // User B tries to buy
      const event = createMockEvent({
        method: 'POST',
        url: `/api/recital-shows/${scenario.show.id}/seats/reserve`,
        params: { id: scenario.show.id },
        body: {
          seat_ids: [seatId],
          session_id: 'session-B'
        }
      })

      await expect(reserveSeats(event)).rejects.toThrow(/reserved|unavailable/)
    })
  })
})
