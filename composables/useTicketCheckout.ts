// composables/useTicketCheckout.ts

import type {
  CreateTicketOrderRequest,
  CreateTicketOrderResponse,
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
  TicketOrder,
  OrderSummary
} from '~/types/ticketing'

export function useTicketCheckout() {
  const toast = useToast()

  /**
   * Create a new ticket order from a reservation
   */
  const createOrder = async (
    request: CreateTicketOrderRequest
  ): Promise<CreateTicketOrderResponse> => {
    try {
      const response = await $fetch<CreateTicketOrderResponse>('/api/ticket-orders/create', {
        method: 'POST',
        body: request
      })

      return response
    } catch (error: any) {
      console.error('Error creating order:', error)

      const errorMessage = error.data?.statusMessage || error.message || 'Failed to create order'

      toast.add({
        severity: 'error',
        summary: 'Order Creation Failed',
        detail: errorMessage,
        life: 5000
      })

      throw new Error(errorMessage)
    }
  }

  /**
   * Create a Stripe payment intent for an order
   */
  const createPaymentIntent = async (
    orderId: string
  ): Promise<CreatePaymentIntentResponse> => {
    try {
      const response = await $fetch<CreatePaymentIntentResponse>(
        '/api/ticket-orders/payment-intent',
        {
          method: 'POST',
          body: { order_id: orderId }
        }
      )

      return response
    } catch (error: any) {
      console.error('Error creating payment intent:', error)

      const errorMessage =
        error.data?.statusMessage || error.message || 'Failed to initialize payment'

      toast.add({
        severity: 'error',
        summary: 'Payment Initialization Failed',
        detail: errorMessage,
        life: 5000
      })

      throw new Error(errorMessage)
    }
  }

  /**
   * Confirm payment after Stripe payment succeeds
   */
  const confirmPayment = async (
    orderId: string,
    paymentIntentId: string
  ): Promise<ConfirmPaymentResponse> => {
    try {
      const response = await $fetch<ConfirmPaymentResponse>('/api/ticket-orders/confirm', {
        method: 'POST',
        body: {
          order_id: orderId,
          payment_intent_id: paymentIntentId
        }
      })

      return response
    } catch (error: any) {
      console.error('Error confirming payment:', error)

      const errorMessage =
        error.data?.statusMessage || error.message || 'Failed to confirm payment'

      toast.add({
        severity: 'error',
        summary: 'Payment Confirmation Failed',
        detail: errorMessage,
        life: 5000
      })

      throw new Error(errorMessage)
    }
  }

  /**
   * Get ticket order by ID
   */
  const getOrder = async (orderId: string): Promise<TicketOrder> => {
    try {
      const response = await $fetch<{ order: TicketOrder }>(`/api/ticket-orders/${orderId}`)

      return response.order
    } catch (error: any) {
      console.error('Error fetching order:', error)

      const errorMessage = error.data?.statusMessage || error.message || 'Failed to fetch order'

      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 5000
      })

      throw new Error(errorMessage)
    }
  }

  /**
   * Complete checkout flow with feedback
   */
  const completeCheckout = async (
    request: CreateTicketOrderRequest
  ): Promise<{ order: TicketOrder; clientSecret: string; publishableKey: string } | null> => {
    try {
      // Step 1: Create order
      const createResponse = await createOrder(request)

      toast.add({
        severity: 'success',
        summary: 'Order Created',
        detail: 'Your order has been created successfully',
        life: 3000
      })

      // Step 2: Create payment intent
      const paymentResponse = await createPaymentIntent(createResponse.order.id)

      return {
        order: createResponse.order,
        clientSecret: paymentResponse.client_secret,
        publishableKey: paymentResponse.publishable_key
      }
    } catch (error) {
      // Error toast already shown by individual methods
      return null
    }
  }

  /**
   * Format price in cents to dollars
   */
  const formatPrice = (priceInCents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(priceInCents / 100)
  }

  /**
   * Calculate order summary totals
   */
  const calculateOrderTotal = (summary: OrderSummary): {
    subtotal: number
    fees: number
    total: number
  } => {
    const subtotal = summary.subtotal_in_cents
    const fees = summary.fees_in_cents
    const total = summary.total_in_cents

    return {
      subtotal,
      fees,
      total
    }
  }

  return {
    createOrder,
    createPaymentIntent,
    confirmPayment,
    getOrder,
    completeCheckout,
    formatPrice,
    calculateOrderTotal
  }
}
