// tests/stores/studio.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStudioStore } from '../../stores/studio'
import type { StudioProfile, StudioLocation } from '~/types/studio'

// Mock useApiService composable
const mockFetchStudioProfile = vi.fn()
const mockUpdateStudioProfile = vi.fn()
const mockFetchLocations = vi.fn()
const mockFetchLocationDetails = vi.fn()
const mockCreateLocation = vi.fn()
const mockUpdateLocation = vi.fn()
const mockDeleteLocation = vi.fn()

vi.mock('~/composables/useApiService', () => ({
  useApiService: () => ({
    fetchStudioProfile: mockFetchStudioProfile,
    updateStudioProfile: mockUpdateStudioProfile,
    fetchLocations: mockFetchLocations,
    fetchLocationDetails: mockFetchLocationDetails,
    createLocation: mockCreateLocation,
    updateLocation: mockUpdateLocation,
    deleteLocation: mockDeleteLocation
  })
}))

// Mock global fetch for logo upload/delete
global.fetch = vi.fn()

describe('Studio Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have null profile initially', () => {
      const store = useStudioStore()
      expect(store.profile).toBeNull()
    })

    it('should have empty locations array initially', () => {
      const store = useStudioStore()
      expect(store.locations).toEqual([])
    })

    it('should have null currentLocation initially', () => {
      const store = useStudioStore()
      expect(store.currentLocation).toBeNull()
    })

    it('should have all loading flags false initially', () => {
      const store = useStudioStore()
      expect(store.loading.profile).toBe(false)
      expect(store.loading.locations).toBe(false)
      expect(store.loading.currentLocation).toBe(false)
      expect(store.loading.operatingHours).toBe(false)
      expect(store.loading.rooms).toBe(false)
      expect(store.loading.logo).toBe(false)
    })

    it('should have no error initially', () => {
      const store = useStudioStore()
      expect(store.error).toBeNull()
    })
  })

  describe('Getters', () => {
    describe('activeLocations', () => {
      it('should filter active locations only', () => {
        const store = useStudioStore()
        store.locations = [
          { id: '1', name: 'Location 1', is_active: true } as StudioLocation,
          { id: '2', name: 'Location 2', is_active: false } as StudioLocation,
          { id: '3', name: 'Location 3', is_active: true } as StudioLocation
        ]

        const active = store.activeLocations
        expect(active).toHaveLength(2)
        expect(active[0].id).toBe('1')
        expect(active[1].id).toBe('3')
      })

      it('should return empty array when no locations exist', () => {
        const store = useStudioStore()
        expect(store.activeLocations).toEqual([])
      })
    })

    describe('hasProfile', () => {
      it('should return true when profile exists', () => {
        const store = useStudioStore()
        store.profile = { id: '1', name: 'Test Studio' } as StudioProfile

        expect(store.hasProfile).toBe(true)
      })

      it('should return false when profile is null', () => {
        const store = useStudioStore()
        expect(store.hasProfile).toBe(false)
      })
    })

    describe('locationById', () => {
      it('should find location by id', () => {
        const store = useStudioStore()
        const location = { id: 'loc-123', name: 'Test Location' } as StudioLocation
        store.locations = [location]

        const found = store.locationById('loc-123')
        expect(found).toEqual(location)
      })

      it('should return undefined for non-existent id', () => {
        const store = useStudioStore()
        store.locations = [{ id: 'loc-123', name: 'Test' } as StudioLocation]

        const found = store.locationById('non-existent')
        expect(found).toBeUndefined()
      })
    })

    describe('studioName', () => {
      it('should return studio name from profile', () => {
        const store = useStudioStore()
        store.profile = { id: '1', name: 'My Dance Studio' } as StudioProfile

        expect(store.studioName).toBe('My Dance Studio')
      })

      it('should return default name when no profile exists', () => {
        const store = useStudioStore()
        expect(store.studioName).toBe('Dance Studio')
      })
    })

    describe('logoUrl', () => {
      it('should return logo URL from profile', () => {
        const store = useStudioStore()
        store.profile = {
          id: '1',
          name: 'Test',
          logo_url: 'https://example.com/logo.png'
        } as StudioProfile

        expect(store.logoUrl).toBe('https://example.com/logo.png')
      })

      it('should return null when no profile exists', () => {
        const store = useStudioStore()
        expect(store.logoUrl).toBeNull()
      })

      it('should return null when profile has no logo', () => {
        const store = useStudioStore()
        store.profile = { id: '1', name: 'Test', logo_url: null } as StudioProfile

        expect(store.logoUrl).toBeNull()
      })
    })
  })

  describe('Actions', () => {
    describe('fetchStudioProfile', () => {
      it('should fetch studio profile successfully', async () => {
        const store = useStudioStore()
        const mockProfile: StudioProfile = {
          id: 'studio-1',
          name: 'Test Studio',
          logo_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        mockFetchStudioProfile.mockReturnValue({
          data: { value: mockProfile },
          error: { value: null }
        })

        const result = await store.fetchStudioProfile()

        expect(result).toEqual(mockProfile)
        expect(store.profile).toEqual(mockProfile)
        expect(store.loading.profile).toBe(false)
        expect(store.error).toBeNull()
      })

      it('should handle fetch errors', async () => {
        const store = useStudioStore()

        mockFetchStudioProfile.mockReturnValue({
          data: { value: null },
          error: { value: { data: { statusMessage: 'Failed to fetch' } } }
        })

        const result = await store.fetchStudioProfile()

        expect(result).toBeNull()
        expect(store.error).toBe('Failed to fetch studio profile')
        expect(store.loading.profile).toBe(false)
      })
    })

    describe('updateStudioProfile', () => {
      it('should update studio profile successfully', async () => {
        const store = useStudioStore()
        const updatedProfile: StudioProfile = {
          id: 'studio-1',
          name: 'Updated Studio',
          logo_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        mockUpdateStudioProfile.mockReturnValue({
          data: { value: { profile: updatedProfile } },
          error: { value: null }
        })

        const result = await store.updateStudioProfile({ name: 'Updated Studio' })

        expect(result).toEqual(updatedProfile)
        expect(store.profile).toEqual(updatedProfile)
        expect(store.loading.profile).toBe(false)
      })

      it('should handle update errors', async () => {
        const store = useStudioStore()

        mockUpdateStudioProfile.mockReturnValue({
          data: { value: null },
          error: { value: { data: { statusMessage: 'Update failed' } } }
        })

        const result = await store.updateStudioProfile({ name: 'Test' })

        expect(result).toBeNull()
        expect(store.error).toBe('Failed to update studio profile')
      })
    })

    describe('uploadLogo', () => {
      it('should upload logo successfully', async () => {
        const store = useStudioStore()
        const mockFile = new File(['test'], 'logo.png', { type: 'image/png' })
        const mockProfile = {
          id: 'studio-1',
          name: 'Test Studio',
          logo_url: 'https://example.com/logo.png'
        }

        ;(global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ profile: mockProfile })
        })

        const result = await store.uploadLogo(mockFile)

        expect(result).toEqual(mockProfile)
        expect(store.profile?.logo_url).toBe('https://example.com/logo.png')
        expect(store.loading.logo).toBe(false)
      })

      it('should handle upload errors', async () => {
        const store = useStudioStore()
        const mockFile = new File(['test'], 'logo.png', { type: 'image/png' })

        ;(global.fetch as any).mockResolvedValue({
          ok: false,
          json: async () => ({ statusMessage: 'Upload failed' })
        })

        const result = await store.uploadLogo(mockFile)

        expect(result).toBeNull()
        expect(store.error).toBe('Upload failed')
        expect(store.loading.logo).toBe(false)
      })
    })

    describe('deleteLogo', () => {
      it('should delete logo successfully', async () => {
        const store = useStudioStore()
        store.profile = {
          id: 'studio-1',
          name: 'Test Studio',
          logo_url: 'https://example.com/logo.png'
        } as StudioProfile

        ;(global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ profile: { id: 'studio-1', logo_url: null } })
        })

        const result = await store.deleteLogo()

        expect(result).toBeTruthy()
        expect(store.profile?.logo_url).toBeNull()
        expect(store.loading.logo).toBe(false)
      })

      it('should handle delete errors', async () => {
        const store = useStudioStore()

        ;(global.fetch as any).mockResolvedValue({
          ok: false,
          json: async () => ({ statusMessage: 'Delete failed' })
        })

        const result = await store.deleteLogo()

        expect(result).toBeNull()
        expect(store.error).toBe('Delete failed')
      })
    })

    describe('fetchLocations', () => {
      it('should fetch locations successfully', async () => {
        const store = useStudioStore()
        const mockLocations: StudioLocation[] = [
          { id: 'loc-1', name: 'Location 1', is_active: true } as StudioLocation,
          { id: 'loc-2', name: 'Location 2', is_active: true } as StudioLocation
        ]

        mockFetchLocations.mockReturnValue({
          data: { value: { locations: mockLocations, pagination: null } },
          error: { value: null }
        })

        const result = await store.fetchLocations()

        expect(result.locations).toEqual(mockLocations)
        expect(store.locations).toEqual(mockLocations)
        expect(store.loading.locations).toBe(false)
      })

      it('should handle fetch errors', async () => {
        const store = useStudioStore()

        mockFetchLocations.mockReturnValue({
          data: { value: null },
          error: { value: { data: { statusMessage: 'Failed to fetch' } } }
        })

        const result = await store.fetchLocations()

        expect(result.locations).toEqual([])
        expect(store.error).toBe('Failed to fetch locations')
      })
    })

    describe('createLocation', () => {
      it('should create location successfully', async () => {
        const store = useStudioStore()
        const newLocation: StudioLocation = {
          id: 'loc-new',
          name: 'New Location',
          is_active: true
        } as StudioLocation

        mockCreateLocation.mockReturnValue({
          data: { value: { location: newLocation } },
          error: { value: null }
        })

        mockFetchLocations.mockReturnValue({
          data: { value: { locations: [newLocation], pagination: null } },
          error: { value: null }
        })

        const result = await store.createLocation({ name: 'New Location' })

        expect(result).toEqual(newLocation)
        expect(store.loading.locations).toBe(false)
      })

      it('should handle create errors', async () => {
        const store = useStudioStore()

        mockCreateLocation.mockReturnValue({
          data: { value: null },
          error: { value: { data: { statusMessage: 'Create failed' } } }
        })

        const result = await store.createLocation({ name: 'Test' })

        expect(result).toBeNull()
        expect(store.error).toBe('Failed to create location')
      })
    })

    describe('updateLocation', () => {
      it('should update location successfully', async () => {
        const store = useStudioStore()
        const location: StudioLocation = {
          id: 'loc-1',
          name: 'Location 1',
          is_active: true
        } as StudioLocation

        store.locations = [location]

        const updatedLocation = { ...location, name: 'Updated Location' }

        mockUpdateLocation.mockReturnValue({
          data: { value: { location: updatedLocation } },
          error: { value: null }
        })

        const result = await store.updateLocation('loc-1', { name: 'Updated Location' })

        expect(result).toEqual(updatedLocation)
        expect(store.locations[0].name).toBe('Updated Location')
        expect(store.loading.currentLocation).toBe(false)
      })

      it('should update currentLocation if it matches', async () => {
        const store = useStudioStore()
        const location: StudioLocation = {
          id: 'loc-1',
          name: 'Location 1',
          is_active: true
        } as StudioLocation

        store.currentLocation = location
        const updatedLocation = { ...location, name: 'Updated' }

        mockUpdateLocation.mockReturnValue({
          data: { value: { location: updatedLocation } },
          error: { value: null }
        })

        await store.updateLocation('loc-1', { name: 'Updated' })

        expect(store.currentLocation.name).toBe('Updated')
      })
    })

    describe('deleteLocation', () => {
      it('should delete location successfully', async () => {
        const store = useStudioStore()
        store.locations = [
          { id: 'loc-1', name: 'Location 1' } as StudioLocation,
          { id: 'loc-2', name: 'Location 2' } as StudioLocation
        ]

        mockDeleteLocation.mockReturnValue({
          data: { value: true },
          error: { value: null }
        })

        const result = await store.deleteLocation('loc-1')

        expect(result).toBe(true)
        expect(store.locations).toHaveLength(1)
        expect(store.locations[0].id).toBe('loc-2')
      })

      it('should clear currentLocation if it matches deleted location', async () => {
        const store = useStudioStore()
        const location = { id: 'loc-1', name: 'Location 1' } as StudioLocation

        store.currentLocation = location
        store.locations = [location]

        mockDeleteLocation.mockReturnValue({
          data: { value: true },
          error: { value: null }
        })

        await store.deleteLocation('loc-1')

        expect(store.currentLocation).toBeNull()
      })

      it('should handle delete errors', async () => {
        const store = useStudioStore()

        mockDeleteLocation.mockReturnValue({
          data: { value: null },
          error: { value: { data: { statusMessage: 'Delete failed' } } }
        })

        const result = await store.deleteLocation('loc-1')

        expect(result).toBe(false)
        expect(store.error).toBe('Failed to delete location')
      })
    })
  })
})
