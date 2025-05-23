import { defineStore } from 'pinia'
import type { StudioProfile, StudioLocation, StudioRoom, OperatingHour, SpecialOperatingHour } from '../types/studio'

export const useStudioStore = defineStore('studio', {
  state: () => ({
    profile: null as StudioProfile | null,
    locations: [] as StudioLocation[],
    currentLocation: null as StudioLocation | null,
    loading: {
      profile: false,
      locations: false,
      currentLocation: false,
      operatingHours: false,
      rooms: false,
      logo: false
    },
    error: null as string | null
  }),
  
  getters: {
    activeLocations: (state) => state.locations.filter(loc => loc.is_active),
    hasProfile: (state) => !!state.profile,
    locationById: (state) => (id: string) => state.locations.find(loc => loc.id === id),
    studioName: (state) => state.profile?.name || 'Dance Studio',
    logoUrl: (state) => state.profile?.logo_url || null
  },
  
  actions: {
    async fetchStudioProfile() {
      const { fetchStudioProfile } = useApiService()
      this.loading.profile = true
      this.error = null
      
      try {
        const { data, error } = await fetchStudioProfile()
        
        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to fetch studio profile')
        }
        
        this.profile = data.value
        return this.profile
      } catch (err) {
        this.error = err.message
        console.error('Error fetching studio profile:', err)
        return null
      } finally {
        this.loading.profile = false
      }
    },
    
    async updateStudioProfile(profileData: Partial<StudioProfile>) {
      const { updateStudioProfile } = useApiService()
      this.loading.profile = true
      this.error = null
      
      try {
        const { data, error } = await updateStudioProfile(profileData)
        
        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to update studio profile')
        }
        
        this.profile = data.value.profile
        return this.profile
      } catch (err) {
        this.error = err.message
        console.error('Error updating studio profile:', err)
        return null
      } finally {
        this.loading.profile = false
      }
    },
    
    // New method: Upload logo
    async uploadLogo(file: File) {
      this.loading.logo = true
      this.error = null
      
      try {
        // Create form data
        const formData = new FormData()
        formData.append('file', file)
        
        // Upload using fetch to handle multipart/form-data
        const response = await fetch('/api/studio/logo', {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.statusMessage || 'Upload failed')
        }
        
        const data = await response.json()
        
        // Update the profile with the new logo URL
        if (this.profile) {
          this.profile.logo_url = data.profile.logo_url
        } else {
          this.profile = data.profile
        }
        
        return data.profile
      } catch (err) {
        this.error = err.message
        console.error('Error uploading logo:', err)
        return null
      } finally {
        this.loading.logo = false
      }
    },
    
    // New method: Delete logo
    async deleteLogo() {
      this.loading.logo = true
      this.error = null
      
      try {
        const response = await fetch('/api/studio/logo', {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.statusMessage || 'Delete failed')
        }
        
        const data = await response.json()
        
        // Update profile to remove logo URL
        if (this.profile) {
          this.profile.logo_url = null
        }
        
        return data.profile
      } catch (err) {
        this.error = err.message
        console.error('Error deleting logo:', err)
        return null
      } finally {
        this.loading.logo = false
      }
    },
    
    // New method: Update logo URL
    updateLogoUrl(logoUrl: string | null) {
      if (this.profile) {
        this.profile.logo_url = logoUrl
      }
    },
    
    async fetchLocations(params = {}) {
      const { fetchLocations } = useApiService()
      this.loading.locations = true
      this.error = null
      
      try {
        const { data, error } = await fetchLocations(params)
        
        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to fetch locations')
        }
        
        this.locations = data.value.locations
        return {
          locations: this.locations,
          pagination: data.value.pagination
        }
      } catch (err) {
        this.error = err.message
        console.error('Error fetching locations:', err)
        return { locations: [], pagination: null }
      } finally {
        this.loading.locations = false
      }
    },
    
    async fetchLocationDetails(id: string) {
      const { fetchLocationDetails } = useApiService()
      this.loading.currentLocation = true
      this.error = null
      
      try {
        const { data, error } = await fetchLocationDetails(id)
        
        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to fetch location details')
        }
        
        this.currentLocation = data.value
        return this.currentLocation
      } catch (err) {
        this.error = err.message
        console.error('Error fetching location details:', err)
        return null
      } finally {
        this.loading.currentLocation = false
      }
    },
    
    async createLocation(locationData: Partial<StudioLocation>) {
      const { createLocation } = useApiService()
      this.loading.locations = true
      this.error = null
      
      try {
        const { data, error } = await createLocation(locationData)
        
        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to create location')
        }
        
        // Refresh locations list
        await this.fetchLocations()
        
        return data.value.location
      } catch (err) {
        this.error = err.message
        console.error('Error creating location:', err)
        return null
      } finally {
        this.loading.locations = false
      }
    },
    
    async updateLocation(id: string, locationData: Partial<StudioLocation>) {
      const { updateLocation } = useApiService()
      this.loading.currentLocation = true
      this.error = null
      
      try {
        const { data, error } = await updateLocation(id, locationData)
        
        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to update location')
        }
        
        // Update in local state
        const index = this.locations.findIndex(loc => loc.id === id)
        if (index !== -1) {
          this.locations[index] = { ...this.locations[index], ...data.value.location }
        }
        
        // If this is the current location, update it
        if (this.currentLocation && this.currentLocation.id === id) {
          this.currentLocation = { ...this.currentLocation, ...data.value.location }
        }
        
        return data.value.location
      } catch (err) {
        this.error = err.message
        console.error('Error updating location:', err)
        return null
      } finally {
        this.loading.currentLocation = false
      }
    },
    
    async deleteLocation(id: string) {
      const { deleteLocation } = useApiService()
      this.loading.locations = true
      this.error = null
      
      try {
        const { data, error } = await deleteLocation(id)
        
        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to delete location')
        }
        
        // Remove from local state
        this.locations = this.locations.filter(loc => loc.id !== id)
        
        // Clear current location if it's the deleted one
        if (this.currentLocation && this.currentLocation.id === id) {
          this.currentLocation = null
        }
        
        return true
      } catch (err) {
        this.error = err.message
        console.error('Error deleting location:', err)
        return false
      } finally {
        this.loading.locations = false
      }
    },
    
    async updateOperatingHours(locationId: string, hours: any[]) {
      const { updateOperatingHours } = useApiService()
      this.loading.operatingHours = true
      this.error = null
      
      try {
        // This is where the issue is - the property names don't match
        // Your component sends: dayOfWeek, openTime, closeTime, isClosed
        // But this function expects: day_of_week, open_time, close_time, is_closed
        const { data, error } = await updateOperatingHours({
          locationId,
          hours: hours // Send hours directly without mapping
        })
        
        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to update operating hours')
        }
        
        // Update in current location if applicable
        if (this.currentLocation && this.currentLocation.id === locationId) {
          this.currentLocation.operatingHours = data.value.hours
        }
        
        return data.value.hours
      } catch (err) {
        this.error = err.message
        console.error('Error updating operating hours:', err)
        return null
      } finally {
        this.loading.operatingHours = false
      }
    },
    
    async createSpecialHours(specialHoursData: Partial<SpecialOperatingHour>) {
      const { createSpecialHours } = useApiService()
      this.loading.operatingHours = true
      this.error = null
      
      try {
        const { data, error } = await createSpecialHours({
          locationId: specialHoursData.location_id,
          date: specialHoursData.date,
          openTime: specialHoursData.open_time,
          closeTime: specialHoursData.close_time,
          isClosed: specialHoursData.is_closed || false,
          description: specialHoursData.description
        })
        
        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to create special hours')
        }
        
        // Update in current location if applicable
        if (this.currentLocation && this.currentLocation.id === specialHoursData.location_id) {
          this.currentLocation.specialHours = [...(this.currentLocation.specialHours || []), data.value.specialHours]
        }
        
        return data.value.specialHours
      } catch (err) {
        this.error = err.message
        console.error('Error creating special hours:', err)
        return null
      } finally {
        this.loading.operatingHours = false
      }
    },
    
    async deleteSpecialHours(id: string, locationId: string) {
      const { deleteSpecialHours } = useApiService()
      this.loading.operatingHours = true
      this.error = null
      
      try {
        const { data, error } = await deleteSpecialHours(id)
        
        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to delete special hours')
        }
        
        // Update in current location if applicable
        if (this.currentLocation && this.currentLocation.id === locationId && this.currentLocation.specialHours) {
          this.currentLocation.specialHours = this.currentLocation.specialHours.filter(sh => sh.id !== id)
        }
        
        return true
      } catch (err) {
        this.error = err.message
        console.error('Error deleting special hours:', err)
        return false
      } finally {
        this.loading.operatingHours = false
      }
    },

    async fetchRoomsByLocation(locationId: string) {
      const { fetchRooms } = useApiService()
      this.loading.rooms = true
      this.error = null
      
      try {
        const { data, error } = await fetchRooms(locationId)
        
        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to fetch rooms')
        }
      } catch (err) {
        
      }
    },
    
    async createRoom(roomData: Partial<StudioRoom>) {
      const { createRoom } = useApiService()
      this.loading.rooms = true
      this.error = null
      
      try {
        const { data, error } = await createRoom({
          locationId: roomData.locationId,
          name: roomData.name,
          description: roomData.description,
          capacity: roomData.capacity,
          areaSqft: roomData.areaSqft,
          features: roomData.features,
          isActive: roomData.isActive
        })
        
        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to create room')
        }
        
        // Update in current location if applicable
        if (this.currentLocation && this.currentLocation.id === roomData.location_id) {
          this.currentLocation.rooms = [...(this.currentLocation.rooms || []), data.value.room]
        }
        
        return data.value.room
      } catch (err) {
        this.error = err.message
        console.error('Error creating room:', err)
        return null
      } finally {
        this.loading.rooms = false
      }
    },
    
    async updateRoom(id: string, roomData: Partial<StudioRoom>) {
      const { updateRoom } = useApiService()
      this.loading.rooms = true
      this.error = null
      
      try {
        const { data, error } = await updateRoom(id, {
          name: roomData.name,
          description: roomData.description,
          capacity: roomData.capacity,
          areaSqft: roomData.area_sqft,
          features: roomData.features,
          isActive: roomData.is_active
        })
        
        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to update room')
        }
        
        // Update in current location if applicable
        if (this.currentLocation && this.currentLocation.rooms) {
          const index = this.currentLocation.rooms.findIndex(room => room.id === id)
          if (index !== -1) {
            this.currentLocation.rooms[index] = data.value.room
          }
        }
        
        return data.value.room
      } catch (err) {
        this.error = err.message
        console.error('Error updating room:', err)
        return null
      } finally {
        this.loading.rooms = false
      }
    },
    
    async deleteRoom(id: string, locationId: string) {
      const { deleteRoom } = useApiService()
      this.loading.rooms = true
      this.error = null
      
      try {
        const { data, error } = await deleteRoom(id)
        
        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to delete room')
        }
        
        // Update in current location if applicable
        if (this.currentLocation && this.currentLocation.id === locationId && this.currentLocation.rooms) {
          this.currentLocation.rooms = this.currentLocation.rooms.filter(room => room.id !== id)
        }
        
        return true
      } catch (err) {
        this.error = err.message
        console.error('Error deleting room:', err)
        return false
      } finally {
        this.loading.rooms = false
      }
    }
  }
})