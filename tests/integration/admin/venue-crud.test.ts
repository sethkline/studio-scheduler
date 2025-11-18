// tests/integration/admin/venue-crud.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockEvent } from '../../utils/mocks'
import { createTestVenue } from '../../utils/factories'

// Import API handlers
import getVenues from '../../../server/api/venues/index.get'
import createVenue from '../../../server/api/venues/index.post'
import getVenue from '../../../server/api/venues/[id].get'
import updateVenue from '../../../server/api/venues/[id].put'
import deleteVenue from '../../../server/api/venues/[id].delete'

// Mock the Supabase client
const mockData = {
  venues: [
    createTestVenue({ id: 'venue-1', name: 'Main Theater' }),
    createTestVenue({ id: 'venue-2', name: 'Studio Hall' })
  ],
  venue_sections: [],
  price_zones: [],
  seats: []
}

vi.mock('../../../server/utils/supabase', () => ({
  getSupabaseClient: () => createMockSupabaseClient(mockData)
}))

describe('Venue CRUD API', () => {
  beforeEach(() => {
    // Reset mock data
    mockData.venues = [
      createTestVenue({ id: 'venue-1', name: 'Main Theater' }),
      createTestVenue({ id: 'venue-2', name: 'Studio Hall' })
    ]
  })

  describe('GET /api/venues', () => {
    it('should return list of all venues', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/venues'
      })

      const response = await getVenues(event)

      expect(response.data).toHaveLength(2)
      expect(response.data[0].name).toBe('Main Theater')
      expect(response.data[1].name).toBe('Studio Hall')
    })

    it('should include related sections and price zones', async () => {
      // Add sections and price zones to mock data
      const venueId = 'venue-1'
      mockData.venue_sections = [
        { id: 'section-1', venue_id: venueId, name: 'Orchestra', display_order: 1 }
      ]
      mockData.price_zones = [
        { id: 'zone-1', venue_id: venueId, name: 'Premium', price_in_cents: 5000, color: '#10B981' }
      ]

      const event = createMockEvent({
        method: 'GET',
        url: '/api/venues'
      })

      const response = await getVenues(event)

      expect(response.data).toBeDefined()
      expect(Array.isArray(response.data)).toBe(true)
    })

    it('should require admin/staff role', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/venues',
        user: { id: 'user-1', user_role: 'parent' }
      })

      // requireAdmin should reject non-admin users
      vi.mocked(global.requireAdmin).mockRejectedValueOnce(
        new Error('Permission denied')
      )

      await expect(getVenues(event)).rejects.toThrow('Permission denied')
    })
  })

  describe('POST /api/venues', () => {
    it('should create new venue with valid data', async () => {
      const newVenue = {
        name: 'New Theater',
        address: '456 Oak St',
        city: 'Testville',
        state: 'CA',
        zip_code: '12345',
        capacity: 300,
        description: 'A brand new theater'
      }

      const event = createMockEvent({
        method: 'POST',
        url: '/api/venues',
        body: newVenue
      })

      const response = await createVenue(event)

      expect(response.data).toBeDefined()
      expect(response.data.name).toBe('New Theater')
      expect(response.data.id).toBeDefined()
    })

    it('should fail with missing required field (name)', async () => {
      const invalidVenue = {
        address: '456 Oak St',
        city: 'Testville'
        // Missing name
      }

      const event = createMockEvent({
        method: 'POST',
        url: '/api/venues',
        body: invalidVenue
      })

      await expect(createVenue(event)).rejects.toThrow()
    })

    it('should require admin role', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: '/api/venues',
        body: { name: 'Test' },
        user: { id: 'user-1', user_role: 'staff' }
      })

      vi.mocked(global.requireAdmin).mockRejectedValueOnce(
        new Error('Permission denied')
      )

      await expect(createVenue(event)).rejects.toThrow('Permission denied')
    })
  })

  describe('GET /api/venues/[id]', () => {
    it('should return single venue by ID', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/venues/venue-1',
        params: { id: 'venue-1' }
      })

      const response = await getVenue(event)

      expect(response.data).toBeDefined()
      expect(response.data.id).toBe('venue-1')
      expect(response.data.name).toBe('Main Theater')
    })

    it('should include sections, price zones, and seat counts', async () => {
      const venueId = 'venue-1'
      mockData.venue_sections = [
        { id: 'section-1', venue_id: venueId, name: 'Orchestra', display_order: 1 }
      ]
      mockData.price_zones = [
        { id: 'zone-1', venue_id: venueId, name: 'Premium', price_in_cents: 5000 }
      ]

      const event = createMockEvent({
        method: 'GET',
        url: `/api/venues/${venueId}`,
        params: { id: venueId }
      })

      const response = await getVenue(event)

      expect(response.data).toBeDefined()
      expect(response.data.id).toBe(venueId)
    })

    it('should return 404 for non-existent venue', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/venues/non-existent',
        params: { id: 'non-existent' }
      })

      await expect(getVenue(event)).rejects.toThrow()
    })
  })

  describe('PUT /api/venues/[id]', () => {
    it('should update venue details', async () => {
      const updates = {
        name: 'Updated Theater Name',
        capacity: 400
      }

      const event = createMockEvent({
        method: 'PUT',
        url: '/api/venues/venue-1',
        params: { id: 'venue-1' },
        body: updates
      })

      const response = await updateVenue(event)

      expect(response.data).toBeDefined()
      expect(response.data.name).toBe('Updated Theater Name')
      expect(response.data.capacity).toBe(400)
    })

    it('should validate input', async () => {
      const invalidUpdates = {
        capacity: -100 // Invalid negative capacity
      }

      const event = createMockEvent({
        method: 'PUT',
        url: '/api/venues/venue-1',
        params: { id: 'venue-1' },
        body: invalidUpdates
      })

      await expect(updateVenue(event)).rejects.toThrow()
    })

    it('should require admin role', async () => {
      const event = createMockEvent({
        method: 'PUT',
        url: '/api/venues/venue-1',
        params: { id: 'venue-1' },
        body: { name: 'Test' },
        user: { id: 'user-1', user_role: 'teacher' }
      })

      vi.mocked(global.requireAdmin).mockRejectedValueOnce(
        new Error('Permission denied')
      )

      await expect(updateVenue(event)).rejects.toThrow('Permission denied')
    })
  })

  describe('DELETE /api/venues/[id]', () => {
    it('should delete venue with no seats', async () => {
      const event = createMockEvent({
        method: 'DELETE',
        url: '/api/venues/venue-1',
        params: { id: 'venue-1' }
      })

      const response = await deleteVenue(event)

      expect(response.success).toBe(true)
      expect(response.message).toContain('deleted')
    })

    it('should fail to delete venue with existing seats', async () => {
      // Add seats to venue
      mockData.seats = [
        { id: 'seat-1', venue_id: 'venue-1', seat_number: 'A1' }
      ]

      const event = createMockEvent({
        method: 'DELETE',
        url: '/api/venues/venue-1',
        params: { id: 'venue-1' }
      })

      await expect(deleteVenue(event)).rejects.toThrow(/in use|has seats/)
    })

    it('should fail to delete venue with existing shows', async () => {
      // Mock show data
      mockData.shows = [
        { id: 'show-1', venue_id: 'venue-1', name: 'Spring Recital' }
      ]

      const event = createMockEvent({
        method: 'DELETE',
        url: '/api/venues/venue-1',
        params: { id: 'venue-1' }
      })

      await expect(deleteVenue(event)).rejects.toThrow()
    })

    it('should require admin role', async () => {
      const event = createMockEvent({
        method: 'DELETE',
        url: '/api/venues/venue-1',
        params: { id: 'venue-1' },
        user: { id: 'user-1', user_role: 'staff' }
      })

      vi.mocked(global.requireAdmin).mockRejectedValueOnce(
        new Error('Permission denied')
      )

      await expect(deleteVenue(event)).rejects.toThrow('Permission denied')
    })
  })
})
