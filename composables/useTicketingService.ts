// composables/useTicketingService.ts
export function useTicketingService() {
  /**
   * Fetches seat layouts
   */
  const fetchSeatLayouts = async () => {
    return await useFetch('/api/seat-layouts')
  }
  
  /**
   * Generate seats for a show based on a layout template
   */
  const generateSeatsForShow = async (showId: string, layoutId: string) => {
    return await useFetch(`/api/recital-shows/${showId}/seats/generate`, {
      method: 'POST',
      body: { layout_id: layoutId }
    })
  }
  
  /**
   * Get available seats for a show
   */
  const getAvailableSeats = async (showId: string, filters = {}) => {
    return await useFetch(`/api/recital-shows/${showId}/seats/available`, {
      params: filters
    })
  }
  
  /**
   * Reserve seats for a potential purchase
   */
  const reserveSeats = async (showId: string, seatIds: string[], email: string) => {
    return await useFetch(`/api/recital-shows/${showId}/seats/reserve`, {
      method: 'POST',
      body: {
        seat_ids: seatIds,
        email
      }
    })
  }
  
  /**
   * Create a ticket order
   */
  const createTicketOrder = async (orderData: {
    recital_show_id: string,
    seat_ids: string[],
    customer_name: string,
    email: string,
    payment_method: string,
    payment_intent_id?: string
  }) => {
    return await useFetch('/api/orders', {
      method: 'POST',
      body: orderData
    })
  }
  
  /**
   * Get seat statistics for a show
   */
  const getSeatStatistics = async (showId: string) => {
    return await useFetch(`/api/recital-shows/${showId}/seats/statistics`)
  }
  
  /**
   * Update show ticket configuration
   */
  const updateTicketConfig = async (showId: string, config: any) => {
    return await useFetch(`/api/recital-shows/${showId}/ticket-config`, {
      method: 'PUT',
      body: config
    })
  }
  
  /**
   * Download seating chart PDF
   */
  const downloadSeatingChart = (showId: string) => {
    window.open(`/api/recital-shows/${showId}/seating-chart/download`, '_blank')
  }
  
  return {
    fetchSeatLayouts,
    generateSeatsForShow,
    getAvailableSeats,
    reserveSeats,
    createTicketOrder,
    getSeatStatistics,
    updateTicketConfig,
    downloadSeatingChart
  }
}