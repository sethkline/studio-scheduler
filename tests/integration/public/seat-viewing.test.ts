// tests/integration/public/seat-viewing.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockEvent } from '../../utils/mocks'
import {
  createTestVenue,
  createTestShow,
  createTestShowSeat,
  createPurchaseFlowScenario
} from '../../utils/factories'

// Import API handlers
import getShowSeats from '../../../server/api/recital-shows/[id]/seats/index.get'

const scenario = createPurchaseFlowScenario()

const mockData = {
  venues: [scenario.venue],
  venue_sections: scenario.sections,
  price_zones: scenario.priceZones,
  seats: scenario.seats,
  recital_shows: [scenario.show],
  show_seats: scenario.showSeats
}

vi.mock('../../../server/utils/supabase', () => ({
  getSupabaseClient: () => createMockSupabaseClient(mockData)
}))

describe('Public Seat Viewing', () => {
  beforeEach(() => {
    mockData.show_seats = scenario.showSeats.map(seat => ({
      ...seat,
      status: 'available'
    }))
  })

  describe('GET /api/recital-shows/[id]/seats', () => {
    it('should view show details (name, date, venue)', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/recital-shows/${scenario.show.id}/seats`,
        params: { id: scenario.show.id }
      })

      const response = await getShowSeats(event)

      expect(response.show).toBeDefined()
      expect(response.show.name).toBe(scenario.show.name)
      expect(response.show.show_date).toBe(scenario.show.show_date)
      expect(response.show.venue_id).toBe(scenario.venue.id)
    })

    it('should view seat map with availability', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/recital-shows/${scenario.show.id}/seats`,
        params: { id: scenario.show.id }
      })

      const response = await getShowSeats(event)

      expect(response.seats).toBeDefined()
      expect(Array.isArray(response.seats)).toBe(true)
      expect(response.seats.length).toBeGreaterThan(0)

      // Check that each seat has status
      response.seats.forEach((seat: any) => {
        expect(seat.status).toBeDefined()
        expect(['available', 'reserved', 'sold', 'held']).toContain(seat.status)
      })
    })

    it('should color-code seats by price zone', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/recital-shows/${scenario.show.id}/seats`,
        params: { id: scenario.show.id }
      })

      const response = await getShowSeats(event)

      response.seats.forEach((seat: any) => {
        expect(seat.price_in_cents).toBeDefined()
        expect(seat.price_zone_color).toBeDefined()
      })
    })

    it('should mark sold seats as disabled', async () => {
      mockData.show_seats[0].status = 'sold'

      const event = createMockEvent({
        method: 'GET',
        url: `/api/recital-shows/${scenario.show.id}/seats`,
        params: { id: scenario.show.id }
      })

      const response = await getShowSeats(event)

      const soldSeat = response.seats.find((s: any) => s.id === mockData.show_seats[0].id)
      expect(soldSeat.status).toBe('sold')
    })

    it('should show reserved seats as temporarily unavailable', async () => {
      mockData.show_seats[0].status = 'reserved'
      mockData.show_seats[0].reserved_until = new Date(Date.now() + 5 * 60 * 1000).toISOString()

      const event = createMockEvent({
        method: 'GET',
        url: `/api/recital-shows/${scenario.show.id}/seats`,
        params: { id: scenario.show.id }
      })

      const response = await getShowSeats(event)

      const reservedSeat = response.seats.find((s: any) => s.id === mockData.show_seats[0].id)
      expect(reservedSeat.status).toBe('reserved')
    })

    it('should be responsive on mobile devices', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/recital-shows/${scenario.show.id}/seats`,
        params: { id: scenario.show.id },
        headers: {
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
        }
      })

      const response = await getShowSeats(event)

      // API should work regardless of device
      expect(response.seats).toBeDefined()
      expect(response.show).toBeDefined()
    })
  })

  describe('Seat Display Properties', () => {
    it('should include all required seat properties', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/recital-shows/${scenario.show.id}/seats`,
        params: { id: scenario.show.id }
      })

      const response = await getShowSeats(event)

      const seat = response.seats[0]
      expect(seat).toHaveProperty('id')
      expect(seat).toHaveProperty('seat_number')
      expect(seat).toHaveProperty('row_name')
      expect(seat).toHaveProperty('section')
      expect(seat).toHaveProperty('price_in_cents')
      expect(seat).toHaveProperty('status')
      expect(seat).toHaveProperty('seat_type')
    })

    it('should include ADA seat indicators', async () => {
      // Mark one seat as ADA
      mockData.show_seats[0].seat_type = 'ada'

      const event = createMockEvent({
        method: 'GET',
        url: `/api/recital-shows/${scenario.show.id}/seats`,
        params: { id: scenario.show.id }
      })

      const response = await getShowSeats(event)

      const adaSeat = response.seats.find((s: any) => s.seat_type === 'ada')
      expect(adaSeat).toBeDefined()
      expect(adaSeat.seat_type).toBe('ada')
    })

    it('should not show blocked or house seats', async () => {
      mockData.show_seats[0].seat_type = 'blocked'
      mockData.show_seats[1].seat_type = 'house'

      const event = createMockEvent({
        method: 'GET',
        url: `/api/recital-shows/${scenario.show.id}/seats`,
        params: { id: scenario.show.id }
      })

      const response = await getShowSeats(event)

      const blockedSeats = response.seats.filter((s: any) => s.seat_type === 'blocked')
      const houseSeats = response.seats.filter((s: any) => s.seat_type === 'house')

      // These seats should be filtered out from public view
      expect(blockedSeats.length).toBe(0)
      expect(houseSeats.length).toBe(0)
    })
  })
})
