// composables/useVenues.ts

import type { Venue, CreateVenueInput, UpdateVenueInput } from '~/types'

/**
 * Composable for venue management operations
 * Provides CRUD operations for venues in the ticketing system
 */
export function useVenues() {
  const toast = useToast()

  /**
   * Fetch all venues
   * @returns Promise with venues data
   */
  const listVenues = async () => {
    try {
      const { data, error } = await useFetch<{ data: Venue[] }>('/api/venues')

      if (error.value) {
        throw new Error(error.value.message || 'Failed to fetch venues')
      }

      return data.value?.data || []
    } catch (error: any) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to load venues',
        life: 3000
      })
      throw error
    }
  }

  /**
   * Fetch a single venue by ID
   * @param id - Venue ID
   * @returns Promise with venue data including sections and price zones
   */
  const getVenue = async (id: string) => {
    try {
      const { data, error } = await useFetch<{ data: Venue }>(`/api/venues/${id}`)

      if (error.value) {
        throw new Error(error.value.message || 'Failed to fetch venue')
      }

      return data.value?.data || null
    } catch (error: any) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to load venue',
        life: 3000
      })
      throw error
    }
  }

  /**
   * Create a new venue
   * @param venueData - Venue creation data
   * @returns Promise with created venue
   */
  const createVenue = async (venueData: CreateVenueInput) => {
    try {
      const { data, error } = await useFetch<{ data: Venue }>('/api/venues', {
        method: 'POST',
        body: venueData
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to create venue')
      }

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Venue created successfully',
        life: 3000
      })

      return data.value?.data || null
    } catch (error: any) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to create venue',
        life: 3000
      })
      throw error
    }
  }

  /**
   * Update an existing venue
   * @param id - Venue ID
   * @param venueData - Updated venue data
   * @returns Promise with updated venue
   */
  const updateVenue = async (id: string, venueData: UpdateVenueInput) => {
    try {
      const { data, error } = await useFetch<{ data: Venue }>(`/api/venues/${id}`, {
        method: 'PUT',
        body: venueData
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to update venue')
      }

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Venue updated successfully',
        life: 3000
      })

      return data.value?.data || null
    } catch (error: any) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to update venue',
        life: 3000
      })
      throw error
    }
  }

  /**
   * Delete a venue
   * @param id - Venue ID
   * @returns Promise indicating success
   */
  const deleteVenue = async (id: string) => {
    try {
      const { error } = await useFetch<{ success: boolean }>(`/api/venues/${id}`, {
        method: 'DELETE'
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to delete venue')
      }

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Venue deleted successfully',
        life: 3000
      })

      return true
    } catch (error: any) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to delete venue',
        life: 3000
      })
      throw error
    }
  }

  return {
    listVenues,
    getVenue,
    createVenue,
    updateVenue,
    deleteVenue
  }
}
