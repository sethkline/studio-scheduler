// tests/integration/admin/seat-map-builder.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockEvent } from '../../utils/mocks'
import {
  createTestVenue,
  createTestSection,
  createTestPriceZone,
  createTestSeat
} from '../../utils/factories'

// Import API handlers
import getSeatMap from '../../../server/api/venues/[id]/seat-map.get'
import saveSeatMap from '../../../server/api/venues/[id]/seat-map.post'
import createSeat from '../../../server/api/venues/[id]/seats/index.post'
import updateSeat from '../../../server/api/venues/[id]/seats/[seatId].put'
import deleteSeat from '../../../server/api/venues/[id]/seats/[seatId].delete'
import importSeats from '../../../server/api/venues/[id]/seats/import.post'

const venue = createTestVenue({ id: 'venue-1' })
const section = createTestSection(venue.id, { id: 'section-1', name: 'Orchestra' })
const priceZone = createTestPriceZone(venue.id, { id: 'zone-1', name: 'Premium' })

const mockData = {
  venues: [venue],
  venue_sections: [section],
  price_zones: [priceZone],
  seats: []
}

vi.mock('../../../server/utils/supabase', () => ({
  getSupabaseClient: () => createMockSupabaseClient(mockData)
}))

describe('Seat Map Builder', () => {
  beforeEach(() => {
    mockData.seats = []
  })

  describe('GET /api/venues/[id]/seat-map', () => {
    it('should load existing seat map', async () => {
      mockData.seats = [
        createTestSeat(venue.id, section.id, priceZone.id, {
          id: 'seat-1',
          seat_number: 'A1',
          row_name: 'A',
          x_position: 100,
          y_position: 100
        }),
        createTestSeat(venue.id, section.id, priceZone.id, {
          id: 'seat-2',
          seat_number: 'A2',
          row_name: 'A',
          x_position: 150,
          y_position: 100
        })
      ]

      const event = createMockEvent({
        method: 'GET',
        url: `/api/venues/${venue.id}/seat-map`,
        params: { id: venue.id }
      })

      const response = await getSeatMap(event)

      expect(response.data).toBeDefined()
      expect(response.data.seats).toHaveLength(2)
      expect(response.data.sections).toBeDefined()
      expect(response.data.price_zones).toBeDefined()
    })
  })

  describe('POST /api/venues/[id]/seats', () => {
    it('should add individual seats to venue', async () => {
      const newSeat = {
        venue_id: venue.id,
        section_id: section.id,
        price_zone_id: priceZone.id,
        row_name: 'A',
        seat_number: 'A1',
        seat_type: 'regular',
        is_sellable: true,
        x_position: 100,
        y_position: 100
      }

      const event = createMockEvent({
        method: 'POST',
        url: `/api/venues/${venue.id}/seats`,
        params: { id: venue.id },
        body: newSeat
      })

      const response = await createSeat(event)

      expect(response.data).toBeDefined()
      expect(response.data.seat_number).toBe('A1')
      expect(response.data.x_position).toBe(100)
    })

    it('should assign price zones to seats', async () => {
      const newSeat = {
        venue_id: venue.id,
        section_id: section.id,
        price_zone_id: priceZone.id,
        row_name: 'B',
        seat_number: 'B1',
        seat_type: 'regular',
        is_sellable: true
      }

      const event = createMockEvent({
        method: 'POST',
        url: `/api/venues/${venue.id}/seats`,
        params: { id: venue.id },
        body: newSeat
      })

      const response = await createSeat(event)

      expect(response.data.price_zone_id).toBe(priceZone.id)
    })

    it('should mark seats as ADA/blocked/house', async () => {
      const adaSeat = {
        venue_id: venue.id,
        section_id: section.id,
        price_zone_id: priceZone.id,
        row_name: 'A',
        seat_number: 'A1',
        seat_type: 'ada',
        is_sellable: true,
        x_position: 100,
        y_position: 100
      }

      const event = createMockEvent({
        method: 'POST',
        url: `/api/venues/${venue.id}/seats`,
        params: { id: venue.id },
        body: adaSeat
      })

      const response = await createSeat(event)

      expect(response.data.seat_type).toBe('ada')
    })
  })

  describe('PUT /api/venues/[id]/seats/[seatId]', () => {
    beforeEach(() => {
      mockData.seats = [
        createTestSeat(venue.id, section.id, priceZone.id, {
          id: 'seat-1',
          seat_number: 'A1',
          x_position: 100,
          y_position: 100
        })
      ]
    })

    it('should update seat positions (x, y coordinates)', async () => {
      const updates = {
        x_position: 200,
        y_position: 150
      }

      const event = createMockEvent({
        method: 'PUT',
        url: `/api/venues/${venue.id}/seats/seat-1`,
        params: { id: venue.id, seatId: 'seat-1' },
        body: updates
      })

      const response = await updateSeat(event)

      expect(response.data.x_position).toBe(200)
      expect(response.data.y_position).toBe(150)
    })

    it('should update seat type', async () => {
      const updates = {
        seat_type: 'house'
      }

      const event = createMockEvent({
        method: 'PUT',
        url: `/api/venues/${venue.id}/seats/seat-1`,
        params: { id: venue.id, seatId: 'seat-1' },
        body: updates
      })

      const response = await updateSeat(event)

      expect(response.data.seat_type).toBe('house')
    })

    it('should update price zone assignment', async () => {
      const newZone = createTestPriceZone(venue.id, {
        id: 'zone-2',
        name: 'General',
        price_in_cents: 2500
      })
      mockData.price_zones.push(newZone)

      const updates = {
        price_zone_id: 'zone-2'
      }

      const event = createMockEvent({
        method: 'PUT',
        url: `/api/venues/${venue.id}/seats/seat-1`,
        params: { id: venue.id, seatId: 'seat-1' },
        body: updates
      })

      const response = await updateSeat(event)

      expect(response.data.price_zone_id).toBe('zone-2')
    })
  })

  describe('DELETE /api/venues/[id]/seats/[seatId]', () => {
    beforeEach(() => {
      mockData.seats = [
        createTestSeat(venue.id, section.id, priceZone.id, {
          id: 'seat-1',
          seat_number: 'A1'
        })
      ]
    })

    it('should delete seats', async () => {
      const event = createMockEvent({
        method: 'DELETE',
        url: `/api/venues/${venue.id}/seats/seat-1`,
        params: { id: venue.id, seatId: 'seat-1' }
      })

      const response = await deleteSeat(event)

      expect(response.success).toBe(true)
    })
  })

  describe('POST /api/venues/[id]/seat-map (Bulk Save)', () => {
    it('should bulk save seat map', async () => {
      const seatMapData = {
        venue_id: venue.id,
        seats: [
          {
            venue_id: venue.id,
            section_id: section.id,
            price_zone_id: priceZone.id,
            row_name: 'A',
            seat_number: 'A1',
            seat_type: 'regular',
            is_sellable: true,
            x_position: 100,
            y_position: 100
          },
          {
            venue_id: venue.id,
            section_id: section.id,
            price_zone_id: priceZone.id,
            row_name: 'A',
            seat_number: 'A2',
            seat_type: 'regular',
            is_sellable: true,
            x_position: 150,
            y_position: 100
          }
        ]
      }

      const event = createMockEvent({
        method: 'POST',
        url: `/api/venues/${venue.id}/seat-map`,
        params: { id: venue.id },
        body: seatMapData
      })

      const response = await saveSeatMap(event)

      expect(response.success).toBe(true)
      expect(response.data.seats).toHaveLength(2)
    })
  })
})

describe('CSV Import', () => {
  beforeEach(() => {
    mockData.seats = []
  })

  describe('POST /api/venues/[id]/seats/import', () => {
    it('should import valid CSV file (creates seats correctly)', async () => {
      const csvData = [
        {
          section: 'Orchestra',
          row_name: 'A',
          seat_number: 'A1',
          price_zone: 'Premium',
          seat_type: 'regular',
          x_position: 100,
          y_position: 100
        },
        {
          section: 'Orchestra',
          row_name: 'A',
          seat_number: 'A2',
          price_zone: 'Premium',
          seat_type: 'regular',
          x_position: 150,
          y_position: 100
        }
      ]

      const event = createMockEvent({
        method: 'POST',
        url: `/api/venues/${venue.id}/seats/import`,
        params: { id: venue.id },
        body: { seats: csvData }
      })

      const response = await importSeats(event)

      expect(response.success).toBe(true)
      expect(response.data.created_count).toBe(2)
    })

    it('should fail with missing columns (validation error)', async () => {
      const invalidCsv = [
        {
          row_name: 'A',
          seat_number: 'A1'
          // Missing section and price_zone
        }
      ]

      const event = createMockEvent({
        method: 'POST',
        url: `/api/venues/${venue.id}/seats/import`,
        params: { id: venue.id },
        body: { seats: invalidCsv }
      })

      await expect(importSeats(event)).rejects.toThrow(/missing|required/)
    })

    it('should fail with duplicate seat numbers', async () => {
      const duplicateCSV = [
        {
          section: 'Orchestra',
          row_name: 'A',
          seat_number: 'A1',
          price_zone: 'Premium',
          seat_type: 'regular'
        },
        {
          section: 'Orchestra',
          row_name: 'A',
          seat_number: 'A1', // Duplicate
          price_zone: 'Premium',
          seat_type: 'regular'
        }
      ]

      const event = createMockEvent({
        method: 'POST',
        url: `/api/venues/${venue.id}/seats/import`,
        params: { id: venue.id },
        body: { seats: duplicateCSV }
      })

      await expect(importSeats(event)).rejects.toThrow(/duplicate|already exists/)
    })

    it('should fail with invalid price zone', async () => {
      const invalidZoneCSV = [
        {
          section: 'Orchestra',
          row_name: 'A',
          seat_number: 'A1',
          price_zone: 'NonExistentZone', // Invalid
          seat_type: 'regular'
        }
      ]

      const event = createMockEvent({
        method: 'POST',
        url: `/api/venues/${venue.id}/seats/import`,
        params: { id: venue.id },
        body: { seats: invalidZoneCSV }
      })

      await expect(importSeats(event)).rejects.toThrow(/price zone|not found/)
    })
  })
})
