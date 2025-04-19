<!-- components/StripeDiagnostic.vue -->
<template>
  <div class="bg-gray-50 p-4 rounded-lg mb-4">
    <h3 class="text-lg font-medium mb-2">Stripe Diagnostic</h3>
    
    <div class="grid grid-cols-2 gap-2">
      <div>Stripe Loaded:</div>
      <div>{{ stripeLoaded ? '✅ Yes' : '❌ No' }}</div>
      
      <div>Elements Created:</div>
      <div>{{ elementsCreated ? '✅ Yes' : '❌ No' }}</div>
      
      <div>Card Element Created:</div>
      <div>{{ cardElementCreated ? '✅ Yes' : '❌ No' }}</div>
      
      <div>Card Element Mounted:</div>
      <div>{{ cardElementMounted ? '✅ Yes' : '❌ No' }}</div>
    </div>
    
    <div v-if="error" class="mt-3 p-3 bg-red-50 text-red-700 rounded">
      <strong>Error:</strong> {{ error }}
    </div>
    
    <div class="mt-3">
      <button 
        @click="testStripe" 
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        :disabled="isLoading"
      >
        {{ isLoading ? 'Testing...' : 'Test Stripe Configuration' }}
      </button>
    </div>
  </div>
  
  <!-- Test Card Mount Area -->
  <div class="mb-4">
    <div id="test-card-element" class="p-3 border rounded mb-2 h-10"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { loadStripe } from '@stripe/stripe-js';

const stripeLoaded = ref(false);
const elementsCreated = ref(false);
const cardElementCreated = ref(false);
const cardElementMounted = ref(false);
const error = ref('');
const isLoading = ref(false);

// Test Stripe setup
async function testStripe() {
  isLoading.value = true;
  error.value = '';
  
  try {
    // Test key that is guaranteed to work
    const testKey = 'pk_test_TYooMQauvdEDq54NiTphI7jx';
    
    // Try to load Stripe
    const stripe = await loadStripe(testKey);
    stripeLoaded.value = !!stripe;
    
    if (!stripe) {
      throw new Error('Failed to load Stripe.js');
    }
    
    // Try to create Elements
    const elements = stripe.elements();
    elementsCreated.value = !!elements;
    
    if (!elements) {
      throw new Error('Failed to create Stripe Elements');
    }
    
    // Try to create Card Element
    const cardElement = elements.create('card');
    cardElementCreated.value = !!cardElement;
    
    if (!cardElement) {
      throw new Error('Failed to create Card Element');
    }
    
    // Try to mount Card Element
    const container = document.getElementById('test-card-element');
    if (!container) {
      throw new Error('Test card element container not found in DOM');
    }
    
    cardElement.mount('#test-card-element');
    cardElementMounted.value = true;
    
    // Success!
    console.log('Stripe diagnostic test completed successfully');
    
  } catch (err) {
    console.error('Stripe diagnostic error:', err);
    error.value = err.message || 'Unknown error testing Stripe';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  console.log('Stripe diagnostic component mounted');
  
  // Auto-run test after a short delay
  setTimeout(() => {
    testStripe();
  }, 1000);
});
</script>