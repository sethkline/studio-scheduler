// composables/useReservationService.ts

interface ReserveSeatRequest {
  show_id: string
  seat_ids: string[]
  email?: string
  phone?: string
}

interface ReserveSeatResponse {
  success: boolean
  message: string
  reservation: {
    id: string
    token: string
    expires_at: string
    seats: Array<{
      id: string
      section: string
      row_name: string
      seat_number: string
      seat_type: string
      handicap_access: boolean
      price_in_cents: number
    }>
    seat_count: number
    total_amount_in_cents: number
  }
}

interface ReleaseReservationRequest {
  token?: string
  reservation_id?: string
}

interface ReleaseReservationResponse {
  success: boolean
  message: string
  reservation_id: string
}

interface CheckReservationResponse {
  success: boolean
  reservation: {
    id: string
    token: string
    show_id: string
    email: string | null
    phone: string | null
    expires_at: string
    is_active: boolean
    is_expired: boolean
    time_remaining_seconds: number
    created_at: string
    seats: Array<{
      id: string
      section: string
      row_name: string
      seat_number: string
      seat_type: string
      handicap_access: boolean
      price_in_cents: number
      status: string
    }>
    seat_count: number
    total_amount_in_cents: number
  }
}

export function useReservationService() {
  const toast = useToast()

  /**
   * Create a new seat reservation
   */
  const reserveSeats = async (
    request: ReserveSeatRequest
  ): Promise<ReserveSeatResponse> => {
    try {
      const response = await $fetch<ReserveSeatResponse>('/api/seat-reservations/reserve', {
        method: 'POST',
        body: request
      })

      return response
    } catch (error: any) {
      console.error('Error reserving seats:', error)

      const errorMessage = error.data?.statusMessage || error.message || 'Failed to reserve seats'

      toast.add({
        severity: 'error',
        summary: 'Reservation Failed',
        detail: errorMessage,
        life: 5000
      })

      throw new Error(errorMessage)
    }
  }

  /**
   * Release/cancel a reservation
   */
  const releaseReservation = async (
    request: ReleaseReservationRequest
  ): Promise<ReleaseReservationResponse> => {
    try {
      const response = await $fetch<ReleaseReservationResponse>('/api/seat-reservations/release', {
        method: 'POST',
        body: request
      })

      return response
    } catch (error: any) {
      console.error('Error releasing reservation:', error)

      const errorMessage = error.data?.statusMessage || error.message || 'Failed to release reservation'

      toast.add({
        severity: 'error',
        summary: 'Release Failed',
        detail: errorMessage,
        life: 5000
      })

      throw new Error(errorMessage)
    }
  }

  /**
   * Check reservation status
   */
  const checkReservation = async (
    tokenOrId: string,
    isToken: boolean = true
  ): Promise<CheckReservationResponse> => {
    try {
      const params = isToken
        ? { token: tokenOrId }
        : { reservation_id: tokenOrId }

      const response = await $fetch<CheckReservationResponse>('/api/seat-reservations/check', {
        method: 'GET',
        params
      })

      return response
    } catch (error: any) {
      console.error('Error checking reservation:', error)

      const errorMessage = error.data?.statusMessage || error.message || 'Failed to check reservation'

      // Don't show toast for this as it might be called frequently
      throw new Error(errorMessage)
    }
  }

  /**
   * Reserve seats and handle common UI feedback
   */
  const reserveSeatsWithFeedback = async (
    showId: string,
    seatIds: string[],
    email?: string,
    phone?: string
  ): Promise<ReserveSeatResponse | null> => {
    try {
      const response = await reserveSeats({
        show_id: showId,
        seat_ids: seatIds,
        email,
        phone
      })

      toast.add({
        severity: 'success',
        summary: 'Seats Reserved',
        detail: `Successfully reserved ${response.reservation.seat_count} seat${response.reservation.seat_count > 1 ? 's' : ''}`,
        life: 3000
      })

      return response
    } catch (error) {
      // Error toast already shown by reserveSeats
      return null
    }
  }

  /**
   * Release reservation with UI feedback
   */
  const releaseReservationWithFeedback = async (
    token: string
  ): Promise<boolean> => {
    try {
      await releaseReservation({ token })

      toast.add({
        severity: 'info',
        summary: 'Reservation Released',
        detail: 'Your seat reservation has been released',
        life: 3000
      })

      return true
    } catch (error) {
      // Error toast already shown by releaseReservation
      return false
    }
  }

  return {
    reserveSeats,
    releaseReservation,
    checkReservation,
    reserveSeatsWithFeedback,
    releaseReservationWithFeedback
  }
}
