<script setup lang="ts">
interface Props {
  clientSecret: string
  publishableKey: string
  amount: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  success: [paymentIntentId: string]
  error: [error: string]
}>()

const toast = useToast()
const { initialize, mountPaymentElement, confirmPayment, isLoading, error, reset } =
  useStripeService()

const processing = ref(false)
const mounted = ref(false)
const initError = ref<string | null>(null)

// Initialize Stripe when component mounts
onMounted(async () => {
  try {
    console.log('Initializing Stripe payment form')
    await initialize(props.publishableKey, props.clientSecret, 'payment-element')

    // Wait a bit for DOM to be ready
    await nextTick()

    // Mount the payment element
    const success = mountPaymentElement('payment-element')
    if (success) {
      mounted.value = true
      console.log('Stripe payment element mounted successfully')
    } else {
      throw new Error('Failed to mount payment element')
    }
  } catch (err: any) {
    console.error('Error initializing Stripe:', err)
    initError.value = err.message || 'Failed to initialize payment form'
    toast.add({
      severity: 'error',
      summary: 'Payment Error',
      detail: initError.value,
      life: 5000
    })
  }
})

// Clean up on unmount
onUnmounted(() => {
  reset()
})

// Handle payment submission
const handleSubmit = async () => {
  if (processing.value || props.disabled) return

  processing.value = true

  try {
    console.log('Processing payment...')

    const result = await confirmPayment({
      confirmParams: {
        return_url: window.location.origin + '/public/checkout/tickets/processing'
      },
      redirect: 'if_required' // Don't redirect unless necessary
    })

    console.log('Payment result:', result)

    if (result.error) {
      // Payment failed
      console.error('Payment error:', result.error)
      emit('error', result.error.message || 'Payment failed')
      toast.add({
        severity: 'error',
        summary: 'Payment Failed',
        detail: result.error.message || 'Your payment could not be processed',
        life: 5000
      })
    } else if (result.paymentIntent) {
      // Payment succeeded
      const paymentIntent = result.paymentIntent

      if (paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded:', paymentIntent.id)
        emit('success', paymentIntent.id)
      } else if (paymentIntent.status === 'processing') {
        // Payment is processing
        toast.add({
          severity: 'info',
          summary: 'Payment Processing',
          detail: 'Your payment is being processed. Please wait...',
          life: 3000
        })
      } else {
        // Other status
        emit('error', `Payment status: ${paymentIntent.status}`)
        toast.add({
          severity: 'warn',
          summary: 'Payment Status',
          detail: `Payment status: ${paymentIntent.status}`,
          life: 5000
        })
      }
    }
  } catch (err: any) {
    console.error('Error processing payment:', err)
    emit('error', err.message || 'An unexpected error occurred')
    toast.add({
      severity: 'error',
      summary: 'Payment Error',
      detail: err.message || 'An unexpected error occurred',
      life: 5000
    })
  } finally {
    processing.value = false
  }
}

// Expose submit method to parent
defineExpose({
  submit: handleSubmit
})

// Format price
const { formatPrice } = useTicketCheckout()
</script>

<template>
  <Card>
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-credit-card text-primary-600"></i>
        <h2 class="text-xl font-semibold text-gray-900">Payment Information</h2>
      </div>
    </template>

    <template #content>
      <div class="space-y-4">
        <!-- Amount Display -->
        <div class="p-4 bg-gray-50 rounded-lg">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Amount to Pay</span>
            <span class="text-2xl font-bold text-primary-600">{{ formatPrice(amount) }}</span>
          </div>
        </div>

        <!-- Error Message -->
        <Message v-if="initError" severity="error" :closable="false">
          {{ initError }}
        </Message>

        <!-- Loading State -->
        <div v-if="isLoading && !mounted" class="flex justify-center items-center py-12">
          <ProgressSpinner
            style="width: 50px; height: 50px"
            strokeWidth="4"
            fill="transparent"
          />
          <span class="ml-3 text-gray-600">Loading payment form...</span>
        </div>

        <!-- Stripe Payment Element -->
        <div v-show="mounted && !initError" class="space-y-4">
          <div id="payment-element" class="min-h-[200px]"></div>

          <!-- Payment Form Footer -->
          <div class="pt-4 border-t border-gray-200">
            <div class="flex items-start gap-2 text-xs text-gray-500">
              <i class="pi pi-lock mt-0.5"></i>
              <p>
                Your payment is secure and encrypted. We use Stripe to process payments safely.
              </p>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <Button
          v-if="mounted && !initError"
          label="Complete Purchase"
          icon="pi pi-check"
          :loading="processing"
          :disabled="disabled || processing"
          @click="handleSubmit"
          class="w-full p-button-lg"
          severity="primary"
        />
      </div>
    </template>
  </Card>
</template>

<style scoped>
/* Ensure payment element has proper styling */
#payment-element {
  /* Stripe will inject its own styles */
}
</style>
