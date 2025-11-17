// composables/useVenues.ts

import type {
  Venue,
  CreateVenueInput,
  UpdateVenueInput,
  VenueSection,
  CreateVenueSectionInput,
  PriceZone,
  CreatePriceZoneInput
} from '~/types'

/**
 * Composable for venue management operations
 * Provides CRUD operations for venues, sections, and price zones in the ticketing system
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

  // ============================================================
  // SECTION MANAGEMENT
  // ============================================================

  /**
   * Create a new section for a venue
   * @param venueId - Venue ID
   * @param sectionData - Section creation data
   * @returns Promise with created section
   */
  const createSection = async (venueId: string, sectionData: Omit<CreateVenueSectionInput, 'venue_id'>) => {
    try {
      const response = await $fetch<{ data: VenueSection }>(`/api/venues/${venueId}/sections`, {
        method: 'POST',
        body: { ...sectionData, venue_id: venueId }
      })

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Section created successfully',
        life: 3000
      })

      return response.data
    } catch (error: any) {
      const errorMessage = error.data?.statusMessage || error.message || 'Failed to create section'
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 3000
      })
      throw error
    }
  }

  /**
   * Update a venue section
   * @param venueId - Venue ID
   * @param sectionId - Section ID
   * @param sectionData - Updated section data
   * @returns Promise with updated section
   */
  const updateSection = async (
    venueId: string,
    sectionId: string,
    sectionData: Partial<Pick<VenueSection, 'name' | 'display_order'>>
  ) => {
    try {
      const response = await $fetch<{ data: VenueSection }>(`/api/venues/${venueId}/sections/${sectionId}`, {
        method: 'PUT',
        body: sectionData
      })

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Section updated successfully',
        life: 3000
      })

      return response.data
    } catch (error: any) {
      const errorMessage = error.data?.statusMessage || error.message || 'Failed to update section'
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 3000
      })
      throw error
    }
  }

  /**
   * Delete a venue section
   * @param venueId - Venue ID
   * @param sectionId - Section ID
   * @returns Promise indicating success
   */
  const deleteSection = async (venueId: string, sectionId: string) => {
    try {
      await $fetch<{ success: boolean }>(`/api/venues/${venueId}/sections/${sectionId}`, {
        method: 'DELETE'
      })

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Section deleted successfully',
        life: 3000
      })

      return true
    } catch (error: any) {
      const errorMessage = error.data?.statusMessage || error.message || 'Failed to delete section'
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 3000
      })
      throw error
    }
  }

  // ============================================================
  // PRICE ZONE MANAGEMENT
  // ============================================================

  /**
   * Create a new price zone for a venue
   * @param venueId - Venue ID
   * @param priceZoneData - Price zone creation data
   * @returns Promise with created price zone
   */
  const createPriceZone = async (venueId: string, priceZoneData: Omit<CreatePriceZoneInput, 'venue_id'>) => {
    try {
      const response = await $fetch<{ data: PriceZone }>(`/api/venues/${venueId}/price-zones`, {
        method: 'POST',
        body: { ...priceZoneData, venue_id: venueId }
      })

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Price zone created successfully',
        life: 3000
      })

      return response.data
    } catch (error: any) {
      const errorMessage = error.data?.statusMessage || error.message || 'Failed to create price zone'
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 3000
      })
      throw error
    }
  }

  /**
   * Update a price zone
   * @param venueId - Venue ID
   * @param zoneId - Price zone ID
   * @param priceZoneData - Updated price zone data
   * @returns Promise with updated price zone
   */
  const updatePriceZone = async (
    venueId: string,
    zoneId: string,
    priceZoneData: Partial<Pick<PriceZone, 'name' | 'price_in_cents' | 'color'>>
  ) => {
    try {
      const response = await $fetch<{ data: PriceZone }>(`/api/venues/${venueId}/price-zones/${zoneId}`, {
        method: 'PUT',
        body: priceZoneData
      })

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Price zone updated successfully',
        life: 3000
      })

      return response.data
    } catch (error: any) {
      const errorMessage = error.data?.statusMessage || error.message || 'Failed to update price zone'
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 3000
      })
      throw error
    }
  }

  /**
   * Delete a price zone
   * @param venueId - Venue ID
   * @param zoneId - Price zone ID
   * @returns Promise indicating success
   */
  const deletePriceZone = async (venueId: string, zoneId: string) => {
    try {
      await $fetch<{ success: boolean }>(`/api/venues/${venueId}/price-zones/${zoneId}`, {
        method: 'DELETE'
      })

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Price zone deleted successfully',
        life: 3000
      })

      return true
    } catch (error: any) {
      const errorMessage = error.data?.statusMessage || error.message || 'Failed to delete price zone'
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 3000
      })
      throw error
    }
  }

  return {
    // Venue operations
    listVenues,
    getVenue,
    createVenue,
    updateVenue,
    deleteVenue,
    // Section operations
    createSection,
    updateSection,
    deleteSection,
    // Price zone operations
    createPriceZone,
    updatePriceZone,
    deletePriceZone
  }
}
