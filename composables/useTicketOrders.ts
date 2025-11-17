// composables/useTicketOrders.ts

import type {
  OrderWithDetails,
  OrderDetails,
  OrderFilters,
  TicketOrder
} from '~/types'

/**
 * Composable for managing ticket orders (admin)
 */
export function useTicketOrders() {
  const toast = useToast()

  /**
   * List all orders with optional filters
   */
  const listOrders = async (filters: OrderFilters = {}) => {
    try {
      const params: Record<string, any> = {}

      if (filters.show_id) params.show_id = filters.show_id
      if (filters.status && filters.status !== 'all') params.status = filters.status
      if (filters.date_from) params.date_from = filters.date_from
      if (filters.date_to) params.date_to = filters.date_to
      if (filters.search) params.search = filters.search
      if (filters.page) params.page = filters.page
      if (filters.limit) params.limit = filters.limit
      if (filters.sort_by) params.sort_by = filters.sort_by
      if (filters.sort_order) params.sort_order = filters.sort_order

      const { data, error } = await useFetch<{
        data: OrderWithDetails[]
        total: number
        page: number
        limit: number
        totalPages: number
      }>('/api/admin/ticketing/orders', {
        params
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to load orders')
      }

      return data.value
    } catch (error: any) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to load orders'
      })
      throw error
    }
  }

  /**
   * Get single order details
   */
  const getOrder = async (orderId: string) => {
    try {
      const { data, error } = await useFetch<{ data: OrderDetails }>(
        `/api/admin/ticketing/orders/${orderId}`
      )

      if (error.value) {
        throw new Error(error.value.message || 'Failed to load order')
      }

      return data.value?.data
    } catch (error: any) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to load order'
      })
      throw error
    }
  }

  /**
   * Update order status
   */
  const updateOrderStatus = async (
    orderId: string,
    status: TicketOrder['status']
  ) => {
    try {
      const response = await $fetch<{ data: TicketOrder }>(
        `/api/admin/ticketing/orders/${orderId}`,
        {
          method: 'PATCH',
          body: { status }
        }
      )

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Order status updated'
      })

      return response.data
    } catch (error: any) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to update order'
      })
      throw error
    }
  }

  /**
   * Resend order confirmation email
   */
  const resendConfirmationEmail = async (orderId: string) => {
    try {
      await $fetch(`/api/admin/ticketing/orders/${orderId}/resend-email`, {
        method: 'POST'
      })

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Confirmation email sent'
      })
    } catch (error: any) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to send email'
      })
      throw error
    }
  }

  /**
   * Process refund for an order
   */
  const refundOrder = async (
    orderId: string,
    amountInCents: number,
    reason?: string
  ) => {
    try {
      const response = await $fetch<{
        success: boolean
        message: string
        data: {
          order: TicketOrder
          refund: any
          seats_released: boolean
        }
      }>(`/api/admin/ticketing/orders/${orderId}/refund`, {
        method: 'POST',
        body: {
          amount_in_cents: amountInCents,
          reason
        }
      })

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: response.message
      })

      return response.data
    } catch (error: any) {
      const errorMessage =
        error.data?.statusMessage ||
        error.message ||
        'Failed to process refund'

      toast.add({
        severity: 'error',
        summary: 'Refund Failed',
        detail: errorMessage
      })
      throw error
    }
  }

  /**
   * Format currency for display
   */
  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  /**
   * Format order status for display
   */
  const formatStatus = (status: TicketOrder['status']): string => {
    const statusMap: Record<TicketOrder['status'], string> = {
      pending: 'Pending',
      paid: 'Paid',
      failed: 'Failed',
      refunded: 'Refunded',
      cancelled: 'Cancelled'
    }
    return statusMap[status] || status
  }

  /**
   * Get severity for status badge
   */
  const getStatusSeverity = (status: TicketOrder['status']) => {
    const severityMap: Record<TicketOrder['status'], string> = {
      pending: 'warning',
      paid: 'success',
      failed: 'danger',
      refunded: 'info',
      cancelled: 'secondary'
    }
    return severityMap[status] || 'secondary'
  }

  return {
    listOrders,
    getOrder,
    updateOrderStatus,
    resendConfirmationEmail,
    refundOrder,
    formatCurrency,
    formatStatus,
    getStatusSeverity
  }
}
