<script setup lang="ts">
import type { CustomerInfo, ReservationDetails, TicketOrder } from '~/types/ticketing'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const showId = route.params.showId as string
const reservationToken = route.query.token as string

// Services
const { checkReservation } = useReservationService()
const { createOrder, createPaymentIntent, confirmPayment, formatPrice } = useTicketCheckout()

// State
const loading = ref(true)
const reservation = ref<ReservationDetails | null>(null)
const customerInfo = ref<CustomerInfo>({
  name: '',
  email: '',
  phone: ''
})
const currentStep = ref<'customer' | 'payment'>('customer')
const order = ref<TicketOrder | null>(null)
const clientSecret = ref<string | null>(null)
const publishableKey = ref<string | null>(null)
const processing = ref(false)

// Component refs
const customerFormRef = ref<any>(null)
const paymentFormRef = ref<any>(null)

// Fetch reservation on mount
onMounted(async () => {
  await loadReservation()
})

// Load reservation details
const loadReservation = async () => {
  if (!reservationToken) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No reservation token provided',
      life: 5000
    })
    router.push(`/public/recital-tickets/${showId}`)
    return
  }

  loading.value = true

  try {
    const response = await checkReservation(reservationToken, true)

    if (!response.success || !response.reservation) {
      throw new Error('Reservation not found or expired')
    }

    reservation.value = response.reservation

    // Check if reservation is expired
    if (response.reservation.is_expired) {
      toast.add({
        severity: 'warn',
        summary: 'Reservation Expired',
        detail: 'Your seat reservation has expired. Please select your seats again.',
        life: 5000
      })
      router.push(`/public/recital-tickets/${showId}`)
      return
    }

    // Pre-fill email if available
    if (response.reservation.email) {
      customerInfo.value.email = response.reservation.email
    }
  } catch (error: any) {
    console.error('Error loading reservation:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load reservation',
      life: 5000
    })
    router.push(`/public/recital-tickets/${showId}`)
  } finally {
    loading.value = false
  }
}

// Handle customer info submission
const handleCustomerInfoSubmit = async (info: CustomerInfo) => {
  customerInfo.value = info
  await proceedToPayment()
}

// Proceed to payment step
const proceedToPayment = async () => {
  if (!reservation.value) return

  processing.value = true

  try {
    // Step 1: Create order
    const orderResponse = await createOrder({
      show_id: showId,
      reservation_token: reservationToken,
      customer_name: customerInfo.value.name,
      customer_email: customerInfo.value.email,
      customer_phone: customerInfo.value.phone
    })

    if (!orderResponse.success || !orderResponse.order) {
      throw new Error(orderResponse.message || 'Failed to create order')
    }

    order.value = orderResponse.order

    // Step 2: Create payment intent
    const paymentResponse = await createPaymentIntent(orderResponse.order.id)

    if (!paymentResponse.success) {
      throw new Error('Failed to initialize payment')
    }

    clientSecret.value = paymentResponse.client_secret
    publishableKey.value = paymentResponse.publishable_key

    // Move to payment step
    currentStep.value = 'payment'

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error: any) {
    console.error('Error proceeding to payment:', error)
    // Error toast already shown by service
  } finally {
    processing.value = false
  }
}

// Handle payment success
const handlePaymentSuccess = async (paymentIntentId: string) => {
  if (!order.value) return

  processing.value = true

  try {
    // Confirm payment on backend
    const response = await confirmPayment(order.value.id, paymentIntentId)

    if (!response.success) {
      throw new Error(response.message || 'Failed to confirm payment')
    }

    toast.add({
      severity: 'success',
      summary: 'Payment Successful',
      detail: 'Your tickets have been purchased!',
      life: 3000
    })

    // Navigate to confirmation page
    router.push(`/public/checkout/tickets/confirmation/${order.value.id}`)
  } catch (error: any) {
    console.error('Error confirming payment:', error)
    // Error toast already shown by service
  } finally {
    processing.value = false
  }
}

// Handle payment error
const handlePaymentError = (error: string) => {
  console.error('Payment error:', error)
  // Error toast already shown by PaymentForm component
}

// Go back to customer info
const goBackToCustomerInfo = () => {
  currentStep.value = 'customer'
}

// Computed
const totalAmount = computed(() => {
  return reservation.value?.total_amount_in_cents || 0
})

const seatCount = computed(() => {
  return reservation.value?.seat_count || 0
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Checkout</h1>
        <p class="mt-2 text-gray-600">Complete your ticket purchase</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <ProgressSpinner />
      </div>

      <!-- Checkout Content -->
      <div v-else-if="reservation" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: Forms -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Steps Indicator -->
          <Card>
            <template #content>
              <div class="flex items-center justify-center gap-4">
                <!-- Step 1 -->
                <div class="flex items-center">
                  <div
                    class="flex items-center justify-center w-10 h-10 rounded-full"
                    :class="
                      currentStep === 'customer'
                        ? 'bg-primary-600 text-white'
                        : 'bg-green-500 text-white'
                    "
                  >
                    <i v-if="currentStep === 'payment'" class="pi pi-check"></i>
                    <span v-else>1</span>
                  </div>
                  <span class="ml-2 text-sm font-medium text-gray-700">Customer Info</span>
                </div>

                <!-- Divider -->
                <div class="flex-1 h-0.5 bg-gray-300"></div>

                <!-- Step 2 -->
                <div class="flex items-center">
                  <div
                    class="flex items-center justify-center w-10 h-10 rounded-full"
                    :class="
                      currentStep === 'payment'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    "
                  >
                    2
                  </div>
                  <span class="ml-2 text-sm font-medium text-gray-700">Payment</span>
                </div>
              </div>
            </template>
          </Card>

          <!-- Customer Info Form -->
          <div v-show="currentStep === 'customer'">
            <CustomerInfoForm
              ref="customerFormRef"
              :initial-values="customerInfo"
              :disabled="processing"
              @submit="handleCustomerInfoSubmit"
            />

            <Button
              label="Continue to Payment"
              icon="pi pi-arrow-right"
              iconPos="right"
              :loading="processing"
              :disabled="processing"
              @click="customerFormRef?.submit()"
              class="w-full mt-4 p-button-lg"
              severity="primary"
            />
          </div>

          <!-- Payment Form -->
          <div v-show="currentStep === 'payment'">
            <PaymentForm
              v-if="clientSecret && publishableKey"
              ref="paymentFormRef"
              :client-secret="clientSecret"
              :publishable-key="publishableKey"
              :amount="totalAmount"
              :disabled="processing"
              @success="handlePaymentSuccess"
              @error="handlePaymentError"
            />

            <Button
              label="Back to Customer Info"
              icon="pi pi-arrow-left"
              :disabled="processing"
              @click="goBackToCustomerInfo"
              class="w-full mt-4"
              severity="secondary"
              outlined
            />
          </div>
        </div>

        <!-- Right Column: Order Summary -->
        <div class="lg:col-span-1">
          <div class="sticky top-6">
            <OrderSummary :reservation="reservation" />

            <!-- Reservation Timer -->
            <ReservationTimer
              v-if="reservation"
              :expires-at="reservation.expires_at"
              class="mt-4"
              @expired="
                () => {
                  toast.add({
                    severity: 'error',
                    summary: 'Reservation Expired',
                    detail: 'Your seat reservation has expired.',
                    life: 5000
                  })
                  router.push(`/public/recital-tickets/${showId}`)
                }
              "
            />
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else class="text-center py-12">
        <i class="pi pi-exclamation-triangle text-6xl text-gray-400 mb-4"></i>
        <h2 class="text-2xl font-semibold text-gray-900 mb-2">Reservation Not Found</h2>
        <p class="text-gray-600 mb-6">
          We couldn't find your reservation. Please select your seats again.
        </p>
        <Button
          label="Back to Seat Selection"
          icon="pi pi-arrow-left"
          @click="router.push(`/public/recital-tickets/${showId}`)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any custom styles here if needed */
</style>
