<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Checkout</h1>
        <p class="text-gray-600 mt-1">Complete your purchase for {{ showCount }} show{{ showCount > 1 ? 's' : '' }}</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <i class="pi pi-spin pi-spinner text-4xl"></i>
        <p class="mt-2">Preparing your order...</p>
      </div>

      <!-- Empty Cart State -->
      <div v-else-if="cart.items.length === 0" class="text-center py-12">
        <i class="pi pi-shopping-cart text-5xl text-gray-300 mb-4"></i>
        <h2 class="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p class="mb-4">Add tickets to your cart to checkout</p>
        <Button label="Browse Shows" icon="pi pi-search" @click="router.push('/public/recitals')" />
      </div>

      <!-- Main Checkout Flow -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Checkout Form (Main Content) -->
        <div class="lg:col-span-2">
          <div class="card p-6">
            <div class="mb-6">
              <h2 class="text-xl font-semibold mb-4">Contact Information</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div class="field">
                  <label for="first-name" class="block text-sm font-medium mb-1">First Name *</label>
                  <InputText
                    id="first-name"
                    v-model="checkoutForm.firstName"
                    class="w-full"
                    :class="{ 'p-invalid': firstNameError }"
                  />
                  <small v-if="firstNameError" class="p-error">{{ firstNameError }}</small>
                </div>
                <div class="field">
                  <label for="last-name" class="block text-sm font-medium mb-1">Last Name *</label>
                  <InputText
                    id="last-name"
                    v-model="checkoutForm.lastName"
                    class="w-full"
                    :class="{ 'p-invalid': lastNameError }"
                  />
                  <small v-if="lastNameError" class="p-error">{{ lastNameError }}</small>
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="field">
                  <label for="email" class="block text-sm font-medium mb-1">Email *</label>
                  <InputText
                    id="email"
                    v-model="checkoutForm.email"
                    type="email"
                    class="w-full"
                    :class="{ 'p-invalid': emailError }"
                  />
                  <small v-if="emailError" class="p-error">{{ emailError }}</small>
                </div>
                <div class="field">
                  <label for="phone" class="block text-sm font-medium mb-1">Phone</label>
                  <InputText id="phone" v-model="checkoutForm.phone" class="w-full" />
                </div>
              </div>
            </div>

            <div class="mb-6">
              <h2 class="text-xl font-semibold mb-4">Payment Information</h2>

              <!-- Stripe Payment Element -->
              <div>
                <div v-if="stripeLoading" class="text-center py-4">
                  <i class="pi pi-spin pi-spinner text-xl"></i>
                  <p class="mt-2">{{ loadingMessage }}</p>
                </div>

                <CommonStripeCardElement
                  v-if="stripeReady"
                  :publishable-key="stripePublicKey"
                  :client-secret="clientSecret"
                  :processing="isPaymentProcessing"
                  @ready="handleStripeReady"
                  @error="handleStripeError"
                  @loading="handleStripeLoading"
                  ref="stripeElementRef"
                />

                <div v-if="isPaymentProcessing" class="flex items-center justify-center py-8 mt-4">
                  <i class="pi pi-spin pi-spinner text-2xl mr-2"></i>
                  <span>Processing payment...</span>
                </div>
              </div>
            </div>

            <div class="border-t pt-4">
              <div class="flex flex-col gap-3">
                <div class="flex items-center">
                  <Checkbox
                    binary
                    :modelValue="checkoutForm.acceptTerms"
                    @update:modelValue="checkoutForm.acceptTerms = $event"
                    inputId="accept-terms"
                    :class="{ 'p-invalid': termsError }"
                  />
                  <label for="accept-terms" class="ml-2">
                    I agree to the Terms and Conditions
                  </label>
                </div>
                <small v-if="termsError" class="p-error">{{ termsError }}</small>

                <div class="flex items-center">
                  <Checkbox
                    binary
                    v-model="checkoutForm.acceptPrivacy"
                    inputId="accept-privacy"
                    :class="{ 'p-invalid': privacyError }"
                  />
                  <label for="accept-privacy" class="ml-2">
                    I understand the Privacy Policy
                  </label>
                </div>
                <small v-if="privacyError" class="p-error">{{ privacyError }}</small>

                <div class="flex items-center">
                  <Checkbox v-model="checkoutForm.optInMarketing" inputId="opt-in-marketing" binary />
                  <label for="opt-in-marketing" class="ml-2">
                    I would like to receive information about future shows (optional)
                  </label>
                </div>
              </div>
            </div>

            <!-- Error message -->
            <div v-if="paymentError" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4 mt-4">
              <div class="flex items-center">
                <i class="pi pi-exclamation-circle text-red-500 mr-2"></i>
                <div>{{ paymentError }}</div>
              </div>
            </div>

            <div class="flex justify-end mt-4">
              <Button
                label="Complete Purchase"
                icon="pi pi-check"
                :loading="isPaymentProcessing"
                @click="processPayment"
                :disabled="isSubmitDisabled"
              />
            </div>
          </div>
        </div>

        <!-- Order Summary (Sidebar) -->
        <div class="lg:col-span-1">
          <div class="card sticky top-4">
            <h2 class="text-xl font-bold mb-4">Order Summary</h2>

            <!-- Show breakdown -->
            <div class="space-y-4 mb-4">
              <div v-for="item in cart.items" :key="item.show_id" class="border-b pb-3">
                <h3 class="font-semibold text-gray-900 mb-2">{{ item.show_name }}</h3>
                <p class="text-sm text-gray-600 mb-2">
                  {{ formatDate(item.show_date) }} at {{ formatTime(item.show_time) }}
                </p>

                <ul class="space-y-1">
                  <li v-for="seat in item.seats" :key="seat.id" class="text-sm flex justify-between">
                    <span class="text-gray-700">
                      {{ seat.section }} - Row {{ seat.row_name }}, Seat {{ seat.seat_number }}
                    </span>
                    <span class="font-medium">${{ formatPrice(seat.price_in_cents || 0) }}</span>
                  </li>
                </ul>

                <div class="flex justify-between mt-2 text-sm font-semibold">
                  <span>Show subtotal:</span>
                  <span>${{ formatPrice(item.seats.reduce((sum, s) => sum + (s.price_in_cents || 0), 0)) }}</span>
                </div>
              </div>
            </div>

            <div class="border-t-2 border-gray-300 pt-4 mb-4">
              <div class="flex justify-between mb-2">
                <span>Subtotal ({{ itemCount }} tickets):</span>
                <span>${{ formatPrice(subtotal) }}</span>
              </div>

              <div class="flex justify-between mb-2">
                <span>Service Fee:</span>
                <span>${{ formatPrice(serviceFee) }}</span>
              </div>

              <div class="flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span>${{ formatPrice(total) }}</span>
              </div>
            </div>

            <div class="bg-gray-50 p-3 rounded-lg mb-6">
              <div class="flex items-center">
                <i class="pi pi-lock text-green-600 mr-2"></i>
                <div class="text-sm">
                  <span class="font-medium">Secure Checkout</span>
                  <p class="text-gray-600">Your payment information is encrypted</p>
                </div>
              </div>
            </div>

            <div class="space-y-2 text-sm text-gray-600">
              <div class="flex items-center">
                <i class="pi pi-ticket mr-2"></i>
                <span>Tickets will be emailed after purchase</span>
              </div>
              <div class="flex items-center">
                <i class="pi pi-calendar mr-2"></i>
                <span>Add to your calendar after checkout</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStripeService } from '~/composables/useStripeService'
import { calculateServiceFee } from '~/utils/stripe'

const { cart, clearCart, itemCount, totalAmount, showCount } = useShoppingCart()
const router = useRouter()
const toast = useToast()
const stripeService = useStripeService()

// State
const loading = ref(false)
const stripePublicKey = ref('')
const clientSecret = ref('')
const stripeReady = ref(false)
const stripeLoading = ref(true)
const loadingMessage = ref('Initializing payment system...')
const stripeElementRef = ref(null)
const isPaymentProcessing = ref(false)
const paymentError = ref('')
const stripeLoaded = ref(false)
const orderId = ref<string | null>(null)

// Form validation errors
const firstNameError = ref('')
const lastNameError = ref('')
const emailError = ref('')
const termsError = ref('')
const privacyError = ref('')

// Form state
const checkoutForm = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  acceptTerms: false,
  acceptPrivacy: false,
  optInMarketing: false
})

// Computed properties
const subtotal = computed(() => totalAmount.value)

const serviceFee = computed(() => {
  return calculateServiceFee(subtotal.value)
})

const total = computed(() => {
  return subtotal.value + serviceFee.value
})

const isSubmitDisabled = computed(() => {
  return isPaymentProcessing.value || !stripeLoaded.value
})

// Lifecycle hooks
onMounted(async () => {
  if (cart.value.items.length === 0) {
    toast.add({
      severity: 'error',
      summary: 'Cart Empty',
      detail: 'Your cart is empty',
      life: 3000
    })
    router.push('/public/recitals')
    return
  }

  try {
    loading.value = true

    // Get Stripe publishable key
    const { data: keyData } = await useFetch('/api/config/stripe-key')
    if (!keyData.value || !keyData.value.publishableKey) {
      throw new Error('Failed to get Stripe API key')
    }

    stripePublicKey.value = keyData.value.publishableKey

    // Create multi-show order on server
    const orderItems = cart.value.items.map(item => ({
      show_id: item.show_id,
      seat_ids: item.seats.map(s => s.id)
    }))

    const { data: orderData, error: orderError } = await useFetch('/api/ticket-orders/create-multi-show', {
      method: 'POST',
      body: {
        customer_name: `${checkoutForm.value.firstName || 'Pending'} ${checkoutForm.value.lastName || 'Customer'}`,
        customer_email: checkoutForm.value.email || 'pending@example.com',
        customer_phone: checkoutForm.value.phone,
        items: orderItems
      }
    })

    if (orderError.value || !orderData.value || !orderData.value.success) {
      throw new Error(orderError.value?.message || 'Failed to create order')
    }

    orderId.value = orderData.value.order.id

    // Create payment intent
    const { data: intentData, error: intentError } = await useFetch('/api/payments/create-intent', {
      method: 'POST',
      body: {
        order_id: orderId.value,
        amount: total.value,
        currency: 'usd',
        payment_method_types: ['card']
      }
    })

    if (intentError.value || !intentData.value || !intentData.value.clientSecret) {
      throw new Error('Failed to create payment intent')
    }

    clientSecret.value = intentData.value.clientSecret

    // Signal that Stripe can now be initialized
    stripeReady.value = true
    loading.value = false
  } catch (error: any) {
    console.error('Checkout initialization error:', error)
    toast.add({
      severity: 'error',
      summary: 'Checkout Error',
      detail: error.message || 'Failed to initialize checkout',
      life: 5000
    })
    loading.value = false
  }
})

// Methods
function handleStripeError(error: any) {
  console.error('Stripe payment element error:', error)
  loadingMessage.value = 'There was a problem loading the payment form. Please refresh the page.'
}

function handleStripeReady(stripeData: any) {
  console.log('Stripe payment element is ready')
  stripeLoading.value = false
  stripeLoaded.value = true
}

function handleStripeLoading(status: string) {
  console.log('Stripe loading status:', status)

  if (status === 'loading-stripe') {
    loadingMessage.value = 'Loading payment system...'
  } else if (status === 'creating-elements') {
    loadingMessage.value = 'Preparing payment form...'
  } else if (status === 'mounting') {
    loadingMessage.value = 'Setting up payment form...'
  } else if (status.includes('error')) {
    loadingMessage.value = 'There was a problem loading the payment form. Please refresh.'
  }
}

function validateForm() {
  let isValid = true

  // Reset errors
  firstNameError.value = ''
  lastNameError.value = ''
  emailError.value = ''
  termsError.value = ''
  privacyError.value = ''

  // Validate first name
  if (!checkoutForm.value.firstName.trim()) {
    firstNameError.value = 'First name is required'
    isValid = false
  }

  // Validate last name
  if (!checkoutForm.value.lastName.trim()) {
    lastNameError.value = 'Last name is required'
    isValid = false
  }

  // Validate email
  if (!checkoutForm.value.email.trim()) {
    emailError.value = 'Email is required'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutForm.value.email.trim())) {
    emailError.value = 'Please enter a valid email address'
    isValid = false
  }

  // Validate terms agreement
  if (!checkoutForm.value.acceptTerms) {
    termsError.value = 'You must accept the terms and conditions'
    isValid = false
  }

  // Validate privacy agreement
  if (!checkoutForm.value.acceptPrivacy) {
    privacyError.value = 'You must accept the privacy policy'
    isValid = false
  }

  return isValid
}

async function processPayment() {
  // Validate form first
  if (!validateForm()) {
    const firstError = document.querySelector('.p-error')
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    return
  }

  isPaymentProcessing.value = true
  paymentError.value = ''

  try {
    console.log('Processing payment...')

    let result

    // Try to use the stripe service directly
    if (stripeService.stripe.value && stripeService.elements.value) {
      result = await stripeService.confirmPayment({
        elements: stripeService.elements.value,
        confirmParams: {
          return_url: window.location.origin + '/cart/confirmation/' + orderId.value,
          payment_method_data: {
            billing_details: {
              name: `${checkoutForm.value.firstName} ${checkoutForm.value.lastName}`,
              email: checkoutForm.value.email,
              phone: checkoutForm.value.phone
            }
          }
        },
        redirect: 'if_required'
      })
    } else if (stripeElementRef.value) {
      const stripeInstance = stripeElementRef.value.stripe?.()
      const elementsInstance = stripeElementRef.value.elements?.()

      if (!stripeInstance || !elementsInstance) {
        throw new Error('Payment system not properly loaded')
      }

      result = await stripeInstance.confirmPayment({
        elements: elementsInstance,
        confirmParams: {
          return_url: window.location.origin + '/cart/confirmation/' + orderId.value,
          payment_method_data: {
            billing_details: {
              name: `${checkoutForm.value.firstName} ${checkoutForm.value.lastName}`,
              email: checkoutForm.value.email,
              phone: checkoutForm.value.phone
            }
          }
        },
        redirect: 'if_required'
      })
    } else {
      throw new Error('Payment system is not ready')
    }

    const { error, paymentIntent } = result

    if (error) {
      throw new Error(error.message || 'Payment failed')
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      await completeOrder(paymentIntent.id)
    }
  } catch (error: any) {
    console.error('Payment error:', error)
    paymentError.value = error.message || 'Payment failed. Please try again.'

    toast.add({
      severity: 'error',
      summary: 'Payment Failed',
      detail: paymentError.value,
      life: 5000
    })
  } finally {
    isPaymentProcessing.value = false
  }
}

async function completeOrder(paymentIntentId: string) {
  if (!orderId.value) return

  try {
    // Update order with payment info
    const { data, error } = await useFetch(`/api/ticket-orders/${orderId.value}/confirm`, {
      method: 'POST',
      body: {
        payment_intent_id: paymentIntentId,
        customer_name: `${checkoutForm.value.firstName} ${checkoutForm.value.lastName}`,
        customer_email: checkoutForm.value.email,
        customer_phone: checkoutForm.value.phone
      }
    })

    if (error.value) {
      throw new Error(error.value.message)
    }

    // Clear cart
    clearCart()

    toast.add({
      severity: 'success',
      summary: 'Success!',
      detail: 'Your tickets have been purchased',
      life: 3000
    })

    // Navigate to confirmation
    router.push(`/cart/confirmation/${orderId.value}`)
  } catch (error: any) {
    console.error('Order completion error:', error)
    paymentError.value = error.message || 'Failed to complete order'
  }
}

// Helper functions
function formatPrice(cents: number) {
  return (cents / 100).toFixed(2)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

function formatTime(timeString: string) {
  const [hours, minutes] = timeString.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })
}

definePageMeta({
  layout: 'default'
})
</script>
