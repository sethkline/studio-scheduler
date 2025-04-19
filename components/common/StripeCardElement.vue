<template>
  <div class="stripe-payment-container">
    <!-- Payment element container -->
    <div class="stripe-element-wrapper">
      <div id="payment-element" class="stripe-element"></div>
      <div id="payment-message" role="alert" class="text-red-500 text-sm mt-2 text-center"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useStripeService } from '~/composables/useStripeService';

const props = defineProps({
  clientSecret: {
    type: String,
    required: true
  },
  publishableKey: {
    type: String,
    required: true
  },
  processing: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['ready', 'error', 'loading']);
const isReady = ref(false);

// Get the Stripe service
const stripeService = useStripeService();

// Watch for loading status changes and emit them
watch(() => stripeService.loadingStatus.value, (status) => {
  if (status) {
    emit('loading', status);
  }
});

// Watch for processing status to prevent unmounting
watch(() => props.processing, (isProcessing) => {
  if (isProcessing) {
    console.log('Payment is processing - will not unmount');
  }
});

onMounted(async () => {
  try {
    // Initialize Stripe through the service
    await stripeService.initialize(props.publishableKey, props.clientSecret);
    
    // Mount the payment element
    const mounted = stripeService.mountPaymentElement('payment-element');
    
    if (mounted) {
      isReady.value = true;
      emit('ready', {
        stripe: stripeService.stripe.value,
        elements: stripeService.elements.value
      });
    }
  } catch (error) {
    console.error('Error setting up Stripe:', error);
    emit('error', error);
  }
});

// Only unmount if not processing a payment
onBeforeUnmount(() => {
  if (!props.processing) {
    console.log('Component unmounting, cleaning up payment element');
    stripeService.unmountPaymentElement();
  } else {
    console.log('Component unmounting SKIPPED due to active payment processing');
  }
});

// Define methods for the parent to access
const confirmPayment = async (options) => {
  return await stripeService.confirmPayment(options);
};

// Expose methods and state to parent component
defineExpose({
  stripe: () => stripeService.stripe.value,
  elements: () => stripeService.elements.value,
  isReady: () => isReady.value,
  confirmPayment
});
</script>

<style>
.stripe-payment-container {
  width: 100%;
  min-height: 250px;
  margin-bottom: 20px;
}

.stripe-element-wrapper {
  width: 100%;
  min-height: 200px;
}

.stripe-element {
  width: 100%;
  padding: 15px;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  min-height: 200px;
}
</style>