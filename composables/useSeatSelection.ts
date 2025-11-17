// composables/useSeatSelection.ts
import { ref, computed } from 'vue'
import type { Ref } from 'vue'

interface Seat {
  id: string
  section: string
  row_name: string
  seat_number: string
  price_in_cents: number
  status: 'available' | 'reserved' | 'sold' | 'held'
  handicap_access?: boolean
  seat_type?: string
  reserved_until?: string
  reserved_by?: string
}

interface ConsecutiveSeatWarning {
  hasWarning: boolean
  message: string
  severity: 'info' | 'warning' | 'error'
}

export function useSeatSelection(maxSeats: number = 10) {
  const selectedSeats = ref<Seat[]>([])
  const reservationToken = ref<string | null>(null)
  const reservationExpiresAt = ref<Date | null>(null)

  /**
   * Check if a seat is selected
   */
  const isSeatSelected = (seatId: string): boolean => {
    return selectedSeats.value.some(seat => seat.id === seatId)
  }

  /**
   * Select a seat
   */
  const selectSeat = (seat: Seat): boolean => {
    // Check if already selected
    if (isSeatSelected(seat.id)) {
      return false
    }

    // Check max seats limit
    if (selectedSeats.value.length >= maxSeats) {
      return false
    }

    // Check if seat is available
    if (seat.status !== 'available') {
      return false
    }

    selectedSeats.value.push(seat)
    return true
  }

  /**
   * Deselect a seat
   */
  const deselectSeat = (seatId: string): boolean => {
    const index = selectedSeats.value.findIndex(seat => seat.id === seatId)
    if (index === -1) {
      return false
    }

    selectedSeats.value.splice(index, 1)
    return true
  }

  /**
   * Toggle seat selection
   */
  const toggleSeat = (seat: Seat): boolean => {
    if (isSeatSelected(seat.id)) {
      return deselectSeat(seat.id)
    } else {
      return selectSeat(seat)
    }
  }

  /**
   * Clear all selected seats
   */
  const clearSelection = () => {
    selectedSeats.value = []
  }

  /**
   * Get total price of selected seats
   */
  const totalPrice = computed(() => {
    return selectedSeats.value.reduce((sum, seat) => {
      return sum + (seat.price_in_cents || 0)
    }, 0)
  })

  /**
   * Get seat count
   */
  const seatCount = computed(() => {
    return selectedSeats.value.length
  })

  /**
   * Check if seats are consecutive
   * This implements the Mechanicsburg Auditorium consecutive seat detection
   */
  const detectConsecutiveSeats = (): ConsecutiveSeatWarning => {
    if (selectedSeats.value.length <= 1) {
      return {
        hasWarning: false,
        message: '',
        severity: 'info'
      }
    }

    // Group seats by section
    const seatsBySection = selectedSeats.value.reduce((acc, seat) => {
      if (!acc[seat.section]) {
        acc[seat.section] = []
      }
      acc[seat.section].push(seat)
      return acc
    }, {} as Record<string, Seat[]>)

    const sections = Object.keys(seatsBySection)

    // Check if all seats are in the same section
    if (sections.length > 1) {
      return {
        hasWarning: true,
        message: `Your selected seats are in ${sections.length} different sections: ${sections.join(', ')}`,
        severity: 'warning'
      }
    }

    // All seats in same section - check if consecutive
    const sectionSeats = seatsBySection[sections[0]]

    // Group by row
    const seatsByRow = sectionSeats.reduce((acc, seat) => {
      if (!acc[seat.row_name]) {
        acc[seat.row_name] = []
      }
      acc[seat.row_name].push(seat)
      return acc
    }, {} as Record<string, Seat[]>)

    const rows = Object.keys(seatsByRow)

    // Check if all seats are in the same row
    if (rows.length > 1) {
      return {
        hasWarning: true,
        message: `Your selected seats are in ${rows.length} different rows in ${sections[0]}`,
        severity: 'info'
      }
    }

    // All seats in same row - check if consecutive
    const rowSeats = seatsByRow[rows[0]]

    // Sort seats by seat number
    const sortedSeats = [...rowSeats].sort((a, b) => {
      const aNum = parseInt(a.seat_number)
      const bNum = parseInt(b.seat_number)
      return aNum - bNum
    })

    // Check if consecutive
    let isConsecutive = true
    for (let i = 0; i < sortedSeats.length - 1; i++) {
      const current = parseInt(sortedSeats[i].seat_number)
      const next = parseInt(sortedSeats[i + 1].seat_number)

      if (next - current !== 1) {
        isConsecutive = false
        break
      }
    }

    if (!isConsecutive) {
      return {
        hasWarning: true,
        message: `Your selected seats in ${sections[0]}, Row ${rows[0]} are not consecutive`,
        severity: 'warning'
      }
    }

    // All good!
    return {
      hasWarning: false,
      message: `${seatCount.value} consecutive seats in ${sections[0]}, Row ${rows[0]}`,
      severity: 'info'
    }
  }

  /**
   * Get consecutive seat warning
   */
  const consecutiveSeatWarning = computed(() => {
    return detectConsecutiveSeats()
  })

  /**
   * Validate selection
   */
  const isValidSelection = (requiredCount?: number): boolean => {
    if (requiredCount) {
      return seatCount.value === requiredCount
    }
    return seatCount.value > 0 && seatCount.value <= maxSeats
  }

  /**
   * Set selected seats (for pre-selection from best seats algorithm)
   */
  const setSelectedSeats = (seats: Seat[]) => {
    if (seats.length > maxSeats) {
      throw new Error(`Cannot select more than ${maxSeats} seats`)
    }
    selectedSeats.value = [...seats]
  }

  /**
   * Get seat by ID from selection
   */
  const getSeatById = (seatId: string): Seat | undefined => {
    return selectedSeats.value.find(seat => seat.id === seatId)
  }

  /**
   * Set reservation details
   */
  const setReservation = (token: string, expiresAt: Date) => {
    reservationToken.value = token
    reservationExpiresAt.value = expiresAt
  }

  /**
   * Clear reservation
   */
  const clearReservation = () => {
    reservationToken.value = null
    reservationExpiresAt.value = null
  }

  /**
   * Check if reservation is expired
   */
  const isReservationExpired = computed(() => {
    if (!reservationExpiresAt.value) {
      return false
    }
    return new Date() > reservationExpiresAt.value
  })

  /**
   * Get time remaining in reservation (in seconds)
   */
  const reservationTimeRemaining = computed(() => {
    if (!reservationExpiresAt.value) {
      return 0
    }
    const now = new Date().getTime()
    const expires = reservationExpiresAt.value.getTime()
    const diff = expires - now
    return Math.max(0, Math.floor(diff / 1000))
  })

  /**
   * Handle real-time seat status update
   * Called when a seat's status changes from real-time subscription
   *
   * @param seatId - ID of the seat that changed
   * @param newStatus - New status of the seat
   * @returns boolean - true if the selection was affected, false otherwise
   */
  const handleSeatStatusUpdate = (seatId: string, newStatus: 'available' | 'reserved' | 'sold' | 'held'): boolean => {
    // Check if this seat is in our selection
    const selectedIndex = selectedSeats.value.findIndex(seat => seat.id === seatId)

    if (selectedIndex === -1) {
      // Seat not in our selection, no action needed
      return false
    }

    // If the seat is no longer available, remove it from selection
    if (newStatus !== 'available') {
      // Only remove if it's not reserved by us
      const seat = selectedSeats.value[selectedIndex]
      const isOurReservation = seat.reserved_by === reservationToken.value

      if (!isOurReservation) {
        console.warn('[useSeatSelection] Seat', seatId, 'is no longer available (status:', newStatus, '). Removing from selection.')
        selectedSeats.value.splice(selectedIndex, 1)
        return true
      }
    }

    return false
  }

  /**
   * Batch update seat statuses from real-time updates
   * More efficient than calling handleSeatStatusUpdate multiple times
   *
   * @param updates - Array of seat updates
   * @returns Array of seat IDs that were removed from selection
   */
  const handleBatchSeatUpdates = (updates: Array<{ seatId: string, status: 'available' | 'reserved' | 'sold' | 'held', reservedBy?: string | null }>): string[] => {
    const removedSeatIds: string[] = []

    updates.forEach(update => {
      const selectedIndex = selectedSeats.value.findIndex(seat => seat.id === update.seatId)

      if (selectedIndex !== -1) {
        const seat = selectedSeats.value[selectedIndex]

        // Check if this is not our reservation
        const isOurReservation = update.reservedBy === reservationToken.value ||
                                  seat.reserved_by === reservationToken.value

        // Remove if seat is no longer available and not reserved by us
        if (update.status !== 'available' && !isOurReservation) {
          selectedSeats.value.splice(selectedIndex, 1)
          removedSeatIds.push(update.seatId)
        }
      }
    })

    return removedSeatIds
  }

  /**
   * Update seat in selection (for keeping local state in sync)
   * Used when we get real-time updates about seats we have selected
   *
   * @param updatedSeat - Updated seat object
   */
  const updateSeatInSelection = (updatedSeat: Seat) => {
    const index = selectedSeats.value.findIndex(seat => seat.id === updatedSeat.id)

    if (index !== -1) {
      // Update the seat while preserving reactivity
      selectedSeats.value[index] = { ...selectedSeats.value[index], ...updatedSeat }
    }
  }

  return {
    // State
    selectedSeats: computed(() => selectedSeats.value),
    reservationToken: computed(() => reservationToken.value),
    reservationExpiresAt: computed(() => reservationExpiresAt.value),

    // Computed
    totalPrice,
    seatCount,
    consecutiveSeatWarning,
    isReservationExpired,
    reservationTimeRemaining,

    // Methods
    isSeatSelected,
    selectSeat,
    deselectSeat,
    toggleSeat,
    clearSelection,
    isValidSelection,
    setSelectedSeats,
    getSeatById,
    setReservation,
    clearReservation,
    detectConsecutiveSeats,

    // Real-time update handlers
    handleSeatStatusUpdate,
    handleBatchSeatUpdates,
    updateSeatInSelection
  }
}
