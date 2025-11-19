// tests/integration/admin/show-configuration.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createMockSupabaseClient, createMockEvent } from '../../utils/mocks'
import {
  createTestVenue,
  createTestSection,
  createTestPriceZone,
  createTestSeat,
  createTestShow,
  createTestShowSeat
} from '../../utils/factories'

// Import API handlers
import updateShow from '../../../server/api/recital-shows/[id]/index.put'
import generateSeats from '../../../server/api/recital-shows/[id]/seats/generate.post'
import getStatistics from '../../../server/api/recital-shows/[id]/seats/statistics.get'

const venue = createTestVenue({ id: 'venue-1', name: 'Main Theater' })
const section = createTestSection(venue.id, { id: 'section-1', name: 'Orchestra' })
const priceZone = createTestPriceZone(venue.id, {
  id: 'zone-1',
  name: 'Premium',
  price_in_cents: 5000
})

const seats = [
  createTestSeat(venue.id, section.id, priceZone.id, {
    id: 'seat-1',
    seat_number: 'A1',
    row_name: 'A'
  }),
  createTestSeat(venue.id, section.id, priceZone.id, {
    id: 'seat-2',
    seat_number: 'A2',
    row_name: 'A'
  }),
  createTestSeat(venue.id, section.id, priceZone.id, {
    id: 'seat-3',
    seat_number: 'A3',
    row_name: 'A'
  })
]

const show = createTestShow({
  id: 'show-1',
  name: 'Spring Recital - Show 1',
  venue_id: null
})

const mockData = {
  venues: [venue],
  venue_sections: [section],
  price_zones: [priceZone],
  seats: [...seats],
  recital_shows: [show],
  show_seats: []
}

vi.mock('../../../server/utils/supabase', () => ({
  getSupabaseClient: () => createMockSupabaseClient(mockData)
}))

describe('Show Configuration', () => {
  beforeEach(() => {
    mockData.recital_shows = [
      createTestShow({
        id: 'show-1',
        name: 'Spring Recital - Show 1',
        venue_id: null
      })
    ]
    mockData.show_seats = []
  })

  describe('Show-Venue Linking', () => {
    it('should assign venue to show', async () => {
      const updates = {
        venue_id: venue.id
      }

      const event = createMockEvent({
        method: 'PUT',
        url: `/api/recital-shows/${show.id}`,
        params: { id: show.id },
        body: updates
      })

      const response = await updateShow(event)

      expect(response.data).toBeDefined()
      expect(response.data.venue_id).toBe(venue.id)
    })

    it('should change venue (with confirmation if seats exist)', async () => {
      // First assign a venue and generate seats
      mockData.recital_shows[0].venue_id = venue.id
      mockData.show_seats = [
        createTestShowSeat(show.id, 'seat-1', { status: 'available' })
      ]

      const newVenue = createTestVenue({ id: 'venue-2', name: 'Other Hall' })
      mockData.venues.push(newVenue)

      const updates = {
        venue_id: newVenue.id,
        confirm_change: true // Required if seats exist
      }

      const event = createMockEvent({
        method: 'PUT',
        url: `/api/recital-shows/${show.id}`,
        params: { id: show.id },
        body: updates
      })

      const response = await updateShow(event)

      expect(response.data.venue_id).toBe(newVenue.id)
    })

    it('should fail to change venue without confirmation when seats exist', async () => {
      mockData.recital_shows[0].venue_id = venue.id
      mockData.show_seats = [
        createTestShowSeat(show.id, 'seat-1', { status: 'sold' })
      ]

      const updates = {
        venue_id: 'venue-2'
        // Missing confirm_change
      }

      const event = createMockEvent({
        method: 'PUT',
        url: `/api/recital-shows/${show.id}`,
        params: { id: show.id },
        body: updates
      })

      await expect(updateShow(event)).rejects.toThrow(/confirmation|seats exist/)
    })
  })

  describe('Seat Generation', () => {
    beforeEach(() => {
      mockData.recital_shows[0].venue_id = venue.id
      mockData.show_seats = []
    })

    it('should generate show_seats from venue template', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: `/api/recital-shows/${show.id}/seats/generate`,
        params: { id: show.id }
      })

      const response = await generateSeats(event)

      expect(response.success).toBe(true)
      expect(response.data.created_count).toBeGreaterThan(0)
    })

    it('should verify all seats copied correctly with prices', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: `/api/recital-shows/${show.id}/seats/generate`,
        params: { id: show.id }
      })

      const response = await generateSeats(event)

      expect(response.success).toBe(true)
      expect(response.data.created_count).toBe(seats.length)

      // Verify each show_seat has correct price from price_zone
      const showSeats = response.data.show_seats || []
      showSeats.forEach((showSeat: any) => {
        expect(showSeat.price_in_cents).toBe(priceZone.price_in_cents)
        expect(showSeat.status).toBe('available')
      })
    })

    it('should prevent duplicate generation (if seats exist)', async () => {
      // Generate seats first time
      const event1 = createMockEvent({
        method: 'POST',
        url: `/api/recital-shows/${show.id}/seats/generate`,
        params: { id: show.id }
      })

      await generateSeats(event1)

      // Try to generate again without confirmation
      mockData.show_seats = [
        createTestShowSeat(show.id, 'seat-1', { status: 'available' })
      ]

      const event2 = createMockEvent({
        method: 'POST',
        url: `/api/recital-shows/${show.id}/seats/generate`,
        params: { id: show.id }
      })

      await expect(generateSeats(event2)).rejects.toThrow(/already exist|duplicate/)
    })

    it('should allow regeneration with confirmation', async () => {
      mockData.show_seats = [
        createTestShowSeat(show.id, 'seat-1', { status: 'available' })
      ]

      const event = createMockEvent({
        method: 'POST',
        url: `/api/recital-shows/${show.id}/seats/generate`,
        params: { id: show.id },
        body: { confirm_regenerate: true }
      })

      const response = await generateSeats(event)

      expect(response.success).toBe(true)
      expect(response.data.created_count).toBeGreaterThan(0)
    })

    it('should verify seat count matches venue template', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: `/api/recital-shows/${show.id}/seats/generate`,
        params: { id: show.id }
      })

      const response = await generateSeats(event)

      expect(response.data.created_count).toBe(seats.length)
    })
  })

  describe('Seat Statistics', () => {
    beforeEach(() => {
      mockData.recital_shows[0].venue_id = venue.id
      mockData.show_seats = [
        createTestShowSeat(show.id, 'seat-1', { status: 'available' }),
        createTestShowSeat(show.id, 'seat-2', { status: 'sold' }),
        createTestShowSeat(show.id, 'seat-3', { status: 'reserved' })
      ]
    })

    it('should view seat statistics for show', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/recital-shows/${show.id}/seats/statistics`,
        params: { id: show.id }
      })

      const response = await getStatistics(event)

      expect(response.data).toBeDefined()
      expect(response.data.total_seats).toBe(3)
      expect(response.data.available_seats).toBe(1)
      expect(response.data.sold_seats).toBe(1)
      expect(response.data.reserved_seats).toBe(1)
    })

    it('should calculate correct percentages', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/recital-shows/${show.id}/seats/statistics`,
        params: { id: show.id }
      })

      const response = await getStatistics(event)

      expect(response.data.sold_percentage).toBeCloseTo(33.33, 1)
      expect(response.data.available_percentage).toBeCloseTo(33.33, 1)
    })
  })

  describe('Database Functions', () => {
    it('should test generate_show_seats() PostgreSQL function', async () => {
      // Mock the RPC call
      const mockClient = createMockSupabaseClient(mockData)
      mockClient.rpc = vi.fn().mockResolvedValue({
        data: {
          created_count: seats.length,
          show_seats: seats.map(seat =>
            createTestShowSeat(show.id, seat.id, {
              seat_number: seat.seat_number,
              row_name: seat.row_name,
              price_in_cents: priceZone.price_in_cents
            })
          )
        },
        error: null
      })

      const result = await mockClient.rpc('generate_show_seats', {
        p_show_id: show.id
      })

      expect(result.data.created_count).toBe(seats.length)
      expect(result.data.show_seats).toHaveLength(seats.length)
    })
  })
})
