// composables/useStripeService.js
import { loadStripe } from '@stripe/stripe-js';
import { ref, readonly } from 'vue';

// Shared state across all instances
const stripe = ref(null);
const elements = ref(null);
const paymentElement = ref(null);
const isInitialized = ref(false);
const isLoading = ref(false);
const loadingStatus = ref('');
const error = ref(null);

// Create a global Stripe instance
export function useStripeService() {
  
  // Initialize Stripe and create the Payment Element
  const initialize = async (publishableKey, clientSecret, elementId = 'payment-element') => {
    if (isInitialized.value) {
      console.log('Stripe already initialized');
      return { stripe: stripe.value, elements: elements.value };
    }
    
    isLoading.value = true;
    loadingStatus.value = 'initializing';
    error.value = null;
    
    try {
      console.log('Initializing Stripe with key');
      stripe.value = await loadStripe(publishableKey);
      
      if (!stripe.value) {
        throw new Error('Failed to initialize Stripe');
      }
      
      console.log('Creating Stripe elements');
      loadingStatus.value = 'creating-elements';
      
      elements.value = stripe.value.elements({
        clientSecret: clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#0570de',
            colorBackground: '#ffffff',
            colorText: '#30313d',
            fontFamily: 'Roboto, Open Sans, Segoe UI, sans-serif',
          }
        }
      });
      
      console.log('Creating payment element');
      loadingStatus.value = 'creating-payment-element';
      
      // Create the payment element
      paymentElement.value = elements.value.create('payment');
      
      isInitialized.value = true;
      
      return { stripe: stripe.value, elements: elements.value };
    } catch (err) {
      console.error('Error initializing Stripe:', err);
      error.value = err;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };
  
  // Mount the payment element to the DOM
  const mountPaymentElement = (elementId = 'payment-element') => {
    if (!paymentElement.value) {
      console.error('Payment element not created yet');
      return false;
    }
    
    try {
      console.log(`Mounting payment element to #${elementId}`);
      loadingStatus.value = 'mounting';
      
      const container = document.getElementById(elementId);
      if (!container) {
        throw new Error(`Payment element container #${elementId} not found in DOM`);
      }
      
      paymentElement.value.mount(`#${elementId}`);
      console.log('Payment element mounted successfully');
      return true;
    } catch (err) {
      console.error('Error mounting payment element:', err);
      error.value = err;
      return false;
    }
  };
  
  // Unmount the payment element
  const unmountPaymentElement = () => {
    if (!paymentElement.value) return;
    
    try {
      console.log('Unmounting payment element');
      paymentElement.value.unmount();
      return true;
    } catch (err) {
      console.error('Error unmounting payment element:', err);
      error.value = err;
      return false;
    }
  };
  
  // Process payment directly from the service
  const confirmPayment = async (options) => {
    if (!stripe.value || !elements.value) {
      throw new Error('Stripe not initialized');
    }
    
    console.log('Processing payment via stripe service');
    return await stripe.value.confirmPayment(options);
  };
  
  // Reset everything - useful when you want to start over
  const reset = () => {
    if (paymentElement.value) {
      try {
        paymentElement.value.unmount();
      } catch (e) {
        console.warn('Failed to unmount payment element:', e);
      }
    }
    
    paymentElement.value = null;
    elements.value = null;
    // Don't reset stripe.value - it can be reused
    isInitialized.value = false;
    error.value = null;
  };
  
  return {
    // State (readonly to prevent direct mutation)
    stripe: readonly(stripe),
    elements: readonly(elements),
    isInitialized: readonly(isInitialized),
    isLoading: readonly(isLoading),
    loadingStatus: readonly(loadingStatus),
    error: readonly(error),
    
    // Methods
    initialize,
    mountPaymentElement,
    unmountPaymentElement,
    confirmPayment,
    reset
  };
}