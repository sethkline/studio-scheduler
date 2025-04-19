<!-- components/StripeCheckout.vue -->
<template>
  <div class="w-full">
    <div class="mb-6">
      <div id="card-element" class="p-3 border rounded mb-2"></div>
      <div id="card-errors" role="alert" class="text-red-500 text-sm mb-4"></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { loadStripe } from '@stripe/stripe-js';

const props = defineProps({
  publicKey: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['ready', 'error']);

const stripe = ref(null);
const elements = ref(null);
const cardElement = ref(null);
const isLoaded = ref(false);

onMounted(async () => {
  try {
    console.log('Initializing Stripe with key:', props.publicKey);
    
    // Load Stripe.js
    stripe.value = await loadStripe(props.publicKey);
    
    if (!stripe.value) {
      throw new Error('Failed to initialize Stripe with the provided key');
    }
    
    // Create Elements instance
    elements.value = stripe.value.elements();
    
    // Create the Card Element
    const cardElementOptions = {
      style: {
        base: {
          iconColor: 'rgb(71 85 105)',
          color: '#000',
          fontWeight: '500',
          fontFamily: 'Roboto, Open Sans, Segoe UI, sans-serif',
          fontSize: '16px',
          fontSmoothing: 'antialiased',
          ':-webkit-autofill': {
            color: '#000'
          },
          '::placeholder': {
            color: 'rgb(71 85 105)'
          }
        },
        invalid: {
          iconColor: '#DC143C',
          color: '#DC143C'
        }
      }
    };
    
    cardElement.value = elements.value.create('card', cardElementOptions);
    
    // Wait for the DOM to be ready and mount the card element
    setTimeout(() => {
      const cardElementContainer = document.getElementById('card-element');
      if (cardElementContainer) {
        console.log('Card element container found, mounting card element');
        cardElement.value.mount('#card-element');
        
        // Handle validation errors
        cardElement.value.on('change', (event) => {
          const displayError = document.getElementById('card-errors');
          if (displayError) {
            if (event.error) {
              displayError.textContent = event.error.message;
              emit('error', event.error);
            } else {
              displayError.textContent = '';
            }
          }
          
          if (!isLoaded.value && !event.error) {
            isLoaded.value = true;
            emit('ready', {
              stripe: stripe.value,
              element: cardElement.value
            });
          }
        });
      } else {
        console.error('Card element container not found');
        emit('error', new Error('Card element container not found'));
      }
    }, 100);
    
  } catch (error) {
    console.error('Error initializing Stripe:', error);
    emit('error', error);
  }
});

onBeforeUnmount(() => {
  // Clean up Stripe elements on unmount
  if (cardElement.value) {
    cardElement.value.unmount();
  }
});

// Expose the Stripe instance and cardElement for the parent component to use
defineExpose({
  stripe,
  cardElement,
  isLoaded
});
</script>

<style scoped>
#card-element {
  height: 40px; /* Adjust the height as needed */
  padding: 10px 12px;
  width: 100%; /* Ensure it occupies the full width of its container */
  background-color: white;
  border: 1px solid #ccc; /* Add a border to make the element visible */
  border-radius: 4px; /* Optional: rounded corners */
  box-shadow: 0 1px 3px 0 #e6ebf1; /* Optional: add some shadow for better visibility */
  -webkit-transition: box-shadow 150ms ease;
  transition: box-shadow 150ms ease;
}

#card-element:focus {
  box-shadow: 0 1px 3px 0 #cfd7df; /* Change box shadow for focus */
}

#card-element.invalid {
  border-color: #fa755a; /* Change border color when there are errors */
}

#card-element.StripeElement--focus {
  box-shadow: 0 1px 3px 0 #cfd7df;
}

/* Style the placeholder text color within the input */
.StripeElement--empty::placeholder {
  color: #9bacc8;
}

.StripeElement--invalid {
  border-color: #fa755a;
}
</style>