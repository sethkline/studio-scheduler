// stores/seatMapBuilder.ts

import { defineStore } from 'pinia'
import type {
  Seat,
  SeatNode,
  VenueSection,
  PriceZone,
  SeatMapData,
  BuilderTool,
  ViewportState,
  HistoryAction,
  CreateSeatInput
} from '~/types'

interface SeatMapBuilderState {
  // Venue data
  venueId: string | null
  sections: VenueSection[]
  priceZones: PriceZone[]
  seats: SeatNode[]

  // Editor state
  selectedTool: BuilderTool
  selectedSeats: string[] // Array of seat IDs
  selectedPriceZoneId: string | null
  selectedSectionId: string | null

  // Canvas state
  viewport: ViewportState

  // History for undo/redo
  history: HistoryAction[]
  historyIndex: number

  // UI state
  loading: boolean
  saving: boolean
  previewMode: boolean
}

export const useSeatMapBuilderStore = defineStore('seatMapBuilder', {
  state: (): SeatMapBuilderState => ({
    venueId: null,
    sections: [],
    priceZones: [],
    seats: [],

    selectedTool: 'select',
    selectedSeats: [],
    selectedPriceZoneId: null,
    selectedSectionId: null,

    viewport: {
      scale: 1,
      offsetX: 0,
      offsetY: 0
    },

    history: [],
    historyIndex: -1,

    loading: false,
    saving: false,
    previewMode: false
  }),

  getters: {
    /**
     * Get seats for a specific section
     */
    seatsBySection: (state) => (sectionId: string) => {
      return state.seats.filter(seat => seat.section_id === sectionId)
    },

    /**
     * Get seats by price zone
     */
    seatsByPriceZone: (state) => (priceZoneId: string) => {
      return state.seats.filter(seat => seat.price_zone_id === priceZoneId)
    },

    /**
     * Get selected seat objects
     */
    selectedSeatObjects: (state) => {
      return state.seats.filter(seat => state.selectedSeats.includes(seat.id))
    },

    /**
     * Check if can undo
     */
    canUndo: (state) => {
      return state.historyIndex > 0
    },

    /**
     * Check if can redo
     */
    canRedo: (state) => {
      return state.historyIndex < state.history.length - 1
    },

    /**
     * Get price zone by ID
     */
    priceZoneById: (state) => (id: string) => {
      return state.priceZones.find(zone => zone.id === id)
    },

    /**
     * Get section by ID
     */
    sectionById: (state) => (id: string) => {
      return state.sections.find(section => section.id === id)
    },

    /**
     * Get total seat count
     */
    totalSeats: (state) => {
      return state.seats.length
    },

    /**
     * Get seat count by type
     */
    seatCountByType: (state) => {
      return {
        regular: state.seats.filter(s => s.seat_type === 'regular').length,
        ada: state.seats.filter(s => s.seat_type === 'ada').length,
        house: state.seats.filter(s => s.seat_type === 'house').length,
        blocked: state.seats.filter(s => s.seat_type === 'blocked').length
      }
    }
  },

  actions: {
    /**
     * Load seat map data from API
     */
    async loadSeatMap(venueId: string) {
      this.loading = true
      this.venueId = venueId

      try {
        const response = await $fetch<{ data: SeatMapData }>(`/api/venues/${venueId}/seat-map`)

        this.sections = response.data.sections
        this.priceZones = response.data.price_zones
        this.seats = response.data.seats.map(seat => ({
          ...seat,
          isSelected: false,
          isDragging: false
        }))

        // Set default section and price zone if available
        if (this.sections.length > 0 && !this.selectedSectionId) {
          this.selectedSectionId = this.sections[0].id
        }
        if (this.priceZones.length > 0 && !this.selectedPriceZoneId) {
          this.selectedPriceZoneId = this.priceZones[0].id
        }
      } catch (error) {
        console.error('Failed to load seat map:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Create a single seat
     */
    async createSeat(seatData: CreateSeatInput) {
      if (!this.venueId) return

      this.saving = true
      try {
        const response = await $fetch<{ data: Seat }>(`/api/venues/${this.venueId}/seats`, {
          method: 'POST',
          body: seatData
        })

        const newSeat: SeatNode = {
          ...response.data,
          isSelected: false,
          isDragging: false
        }

        this.seats.push(newSeat)

        // Add to history
        this.addToHistory({
          type: 'create',
          timestamp: Date.now(),
          data: newSeat
        })

        return newSeat
      } catch (error) {
        console.error('Failed to create seat:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    /**
     * Bulk create seats
     */
    async bulkCreateSeats(seats: CreateSeatInput[]) {
      if (!this.venueId) return

      this.saving = true
      try {
        const response = await $fetch<{ data: Seat[] }>(`/api/venues/${this.venueId}/seat-map`, {
          method: 'POST',
          body: {
            venue_id: this.venueId,
            seats
          }
        })

        const newSeats: SeatNode[] = response.data.map(seat => ({
          ...seat,
          isSelected: false,
          isDragging: false
        }))

        this.seats.push(...newSeats)

        // Add to history
        this.addToHistory({
          type: 'bulk-create',
          timestamp: Date.now(),
          data: newSeats
        })

        return newSeats
      } catch (error) {
        console.error('Failed to bulk create seats:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    /**
     * Update a seat
     */
    async updateSeat(seatId: string, updates: Partial<Seat>) {
      if (!this.venueId) return

      this.saving = true
      try {
        const response = await $fetch<{ data: Seat }>(`/api/venues/${this.venueId}/seats/${seatId}`, {
          method: 'PUT',
          body: updates
        })

        const index = this.seats.findIndex(s => s.id === seatId)
        if (index !== -1) {
          const oldSeat = { ...this.seats[index] }
          this.seats[index] = {
            ...response.data,
            isSelected: this.seats[index].isSelected,
            isDragging: this.seats[index].isDragging
          }

          // Add to history
          this.addToHistory({
            type: 'update',
            timestamp: Date.now(),
            data: { old: oldSeat, new: this.seats[index] }
          })
        }

        return response.data
      } catch (error) {
        console.error('Failed to update seat:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    /**
     * Delete a seat
     */
    async deleteSeat(seatId: string) {
      if (!this.venueId) return

      this.saving = true
      try {
        const seatToDelete = this.seats.find(s => s.id === seatId)

        await $fetch(`/api/venues/${this.venueId}/seats/${seatId}`, {
          method: 'DELETE'
        })

        this.seats = this.seats.filter(s => s.id !== seatId)
        this.selectedSeats = this.selectedSeats.filter(id => id !== seatId)

        // Add to history
        if (seatToDelete) {
          this.addToHistory({
            type: 'delete',
            timestamp: Date.now(),
            data: seatToDelete
          })
        }
      } catch (error) {
        console.error('Failed to delete seat:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    /**
     * Delete selected seats
     */
    async deleteSelectedSeats() {
      const seatsToDelete = [...this.selectedSeats]
      for (const seatId of seatsToDelete) {
        await this.deleteSeat(seatId)
      }
    },

    /**
     * Select a seat
     */
    selectSeat(seatId: string, addToSelection = false) {
      if (addToSelection) {
        if (!this.selectedSeats.includes(seatId)) {
          this.selectedSeats.push(seatId)
        }
      } else {
        this.selectedSeats = [seatId]
      }

      // Update visual state
      this.seats.forEach(seat => {
        seat.isSelected = this.selectedSeats.includes(seat.id)
      })
    },

    /**
     * Deselect all seats
     */
    deselectAll() {
      this.selectedSeats = []
      this.seats.forEach(seat => {
        seat.isSelected = false
      })
    },

    /**
     * Set tool
     */
    setTool(tool: BuilderTool) {
      this.selectedTool = tool
      if (tool !== 'select') {
        this.deselectAll()
      }
    },

    /**
     * Set viewport
     */
    setViewport(viewport: Partial<ViewportState>) {
      this.viewport = { ...this.viewport, ...viewport }
    },

    /**
     * Zoom in
     */
    zoomIn() {
      this.viewport.scale = Math.min(this.viewport.scale + 0.1, 3)
    },

    /**
     * Zoom out
     */
    zoomOut() {
      this.viewport.scale = Math.max(this.viewport.scale - 0.1, 0.1)
    },

    /**
     * Reset viewport
     */
    resetViewport() {
      this.viewport = {
        scale: 1,
        offsetX: 0,
        offsetY: 0
      }
    },

    /**
     * Add action to history
     */
    addToHistory(action: HistoryAction) {
      // Remove any history after current index
      this.history = this.history.slice(0, this.historyIndex + 1)

      // Add new action
      this.history.push(action)
      this.historyIndex++

      // Limit history to 50 actions
      if (this.history.length > 50) {
        this.history.shift()
        this.historyIndex--
      }
    },

    /**
     * Undo last action
     */
    async undo() {
      if (!this.canUndo) return

      const action = this.history[this.historyIndex]
      this.historyIndex--

      // Implement undo logic based on action type
      // This is a simplified version - you may want to expand this
      switch (action.type) {
        case 'create':
          this.seats = this.seats.filter(s => s.id !== action.data.id)
          break
        case 'delete':
          this.seats.push(action.data)
          break
        case 'update':
          const index = this.seats.findIndex(s => s.id === action.data.old.id)
          if (index !== -1) {
            this.seats[index] = action.data.old
          }
          break
      }
    },

    /**
     * Redo last undone action
     */
    async redo() {
      if (!this.canRedo) return

      this.historyIndex++
      const action = this.history[this.historyIndex]

      // Implement redo logic based on action type
      switch (action.type) {
        case 'create':
          this.seats.push(action.data)
          break
        case 'delete':
          this.seats = this.seats.filter(s => s.id !== action.data.id)
          break
        case 'update':
          const index = this.seats.findIndex(s => s.id === action.data.new.id)
          if (index !== -1) {
            this.seats[index] = action.data.new
          }
          break
      }
    },

    /**
     * Toggle preview mode
     */
    togglePreviewMode() {
      this.previewMode = !this.previewMode
      if (this.previewMode) {
        this.deselectAll()
        this.selectedTool = 'select'
      }
    },

    /**
     * Reset store
     */
    reset() {
      this.$reset()
    }
  }
})
