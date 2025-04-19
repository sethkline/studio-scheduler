<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center mb-2">
        <NuxtLink :to="`/public/recitals/${reservation.show_id}/seating`" class="text-primary-600 mr-2">
          <i class="pi pi-arrow-left"></i> Change Seats
        </NuxtLink>
      </div>
      <h1 class="text-3xl font-bold">Complete Your Purchase</h1>
      <p v-if="reservation.show_name" class="text-gray-600 mt-1">
        {{ reservation.show_name }} - {{ formatDate(reservation.show_date) }}
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl"></i>
      <p class="mt-2">Loading your reservation...</p>
    </div>

    <!-- Reservation expired -->
    <div v-else-if="isReservationExpired" class="card p-6 text-center">
      <i class="pi pi-exclamation-triangle text-5xl text-yellow-500 mb-4"></i>
      <h2 class="text-2xl font-bold mb-2">Reservation Expired</h2>
      <p class="mb-4">Your seat reservation has expired. Please select your seats again.</p>
      <NuxtLink to="/public/recitals">
        <Button label="Browse Shows" icon="pi pi-search" class="mr-2" />
      </NuxtLink>
    </div>

    <!-- Main Checkout Flow -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Checkout Form (Main Content) -->
      <div class="lg:col-span-2 order-2 lg:order-1">
        <div class="card p-6">
          <div v-if="showReservationTimer" class="mb-6">
            <!-- <TicketReservationTimer
              :duration="30"
              :warningThreshold="5"
              :criticalThreshold="2"
              @expire="handleReservationExpired"
            /> -->
            <p class="text-sm text-gray-500 mt-2">
              <i class="pi pi-clock mr-1"></i> Your seat reservation will expire in {{ reservationTimeRemaining }}
            </p>
          </div>

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
                <small v-if="firstNameError" class="p-error">
                  {{ firstNameError }}
                </small>
              </div>
              <div class="field">
                <label for="last-name" class="block text-sm font-medium mb-1">Last Name *</label>
                <InputText
                  id="last-name"
                  v-model="checkoutForm.lastName"
                  class="w-full"
                  :class="{ 'p-invalid': lastNameError }"
                />
                <small v-if="lastNameError" class="p-error">
                  {{ lastNameError }}
                </small>
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
                <small v-if="emailError" class="p-error">
                  {{ emailError }}
                </small>
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

          <div class="mb-6">
            <h2 class="text-xl font-semibold mb-3">Additional Information</h2>
            <div class="field">
              <label for="special-requests" class="block text-sm font-medium mb-1">Special Requests</label>
              <Textarea id="special-requests" v-model="checkoutForm.specialRequests" rows="3" class="w-full" />
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
                  I agree to the
                  <a href="#" class="text-primary-600 hover:underline" @click.prevent="showTermsDialog = true"
                    >Terms and Conditions</a
                  >
                </label>
              </div>
              <small v-if="termsError" class="p-error">
                {{ termsError }}
              </small>

              <div class="flex items-center">
                <Checkbox
                  binary
                  v-model="checkoutForm.acceptPrivacy"
                  inputId="accept-privacy"
                  :class="{ 'p-invalid': privacyError }"
                />
                <label for="accept-privacy" class="ml-2">
                  I understand the
                  <a href="#" class="text-primary-600 hover:underline" @click.prevent="showPrivacyDialog = true"
                    >Privacy Policy</a
                  >
                </label>
              </div>
              <small v-if="privacyError" class="p-error">
                {{ privacyError }}
              </small>

              <div class="flex items-center">
                <Checkbox v-model="checkoutForm.optInMarketing" inputId="opt-in-marketing" binary />
                <label for="opt-in-marketing" class="ml-2">
                  I would like to receive information about future shows (optional)
                </label>
              </div>
            </div>
          </div>

          <!-- Error message -->
          <div v-if="paymentError" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4">
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
      <div class="lg:col-span-1 order-1 lg:order-2">
        <div class="card sticky top-4">
          <h2 class="text-xl font-bold mb-4">Order Summary</h2>

          <ul class="divide-y mb-4">
            <li v-for="seat in reservation.seats" :key="seat.id" class="py-2">
              <div class="flex justify-between">
                <div>
                  <span class="font-medium">{{ seat.section }} - Row {{ seat.row_name }}</span>
                  <div class="text-sm text-gray-600">Seat {{ seat.seat_number }}</div>
                  <div v-if="seat.seat_type === 'handicap'" class="text-xs text-blue-600">Accessible Seat</div>
                </div>
                <div class="text-right font-medium">
                  ${{ formatPrice(seat.price_in_cents || reservation.ticket_price_in_cents) }}
                </div>
              </div>
            </li>
          </ul>

          <div class="border-t border-gray-200 pt-4 mb-4">
            <div class="flex justify-between mb-2">
              <span>Subtotal ({{ reservation.seats.length }} tickets):</span>
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

    <!-- Purchase Complete Dialog -->
    <Dialog
      v-model:visible="showPurchaseCompleteDialog"
      :modal="true"
      :closable="false"
      header="Purchase Complete!"
      class="w-full max-w-lg"
    >
      <div class="text-center mb-6">
        <i class="pi pi-check-circle text-green-500 text-6xl mb-4"></i>
        <h2 class="text-2xl font-bold mb-2">Thank You for Your Purchase!</h2>
        <p>Your tickets have been reserved and a confirmation has been sent to your email.</p>
      </div>

      <div class="bg-gray-50 p-4 rounded-lg mb-6">
        <div class="text-center mb-3">
          <h3 class="font-semibold">Order #{{ purchaseComplete.orderNumber }}</h3>
          <p class="text-sm text-gray-600">
            {{ formatDate(reservation.show_date) }} at {{ formatTime(reservation.show_time) }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div class="font-medium">Show:</div>
            <div>{{ reservation.show_name }}</div>
          </div>
          <div>
            <div class="font-medium">Venue:</div>
            <div>{{ reservation.show_location }}</div>
          </div>
          <div>
            <div class="font-medium">Tickets:</div>
            <div>{{ reservation.seats.length }}</div>
          </div>
          <div>
            <div class="font-medium">Total Amount:</div>
            <div>${{ formatPrice(total) }}</div>
          </div>
        </div>
      </div>

      <div class="text-center mb-4">
        <p class="mb-2">What would you like to do next?</p>
      </div>

      <div class="flex flex-col sm:flex-row justify-center gap-3">
        <Button label="View My Tickets" icon="pi pi-ticket" @click="navigateToTickets" />
        <Button label="Add to Calendar" icon="pi pi-calendar-plus" class="p-button-outlined" @click="addToCalendar" />
        <Button label="Return to Home" icon="pi pi-home" class="p-button-outlined" @click="navigateToHome" />
      </div>
    </Dialog>

    <!-- Terms and Privacy Dialogs -->
    <Dialog v-model:visible="showTermsDialog" header="Terms and Conditions" :modal="true" class="w-full max-w-2xl">
      <div class="prose prose-sm max-w-none">
        <h3>Terms & Conditions</h3>
        <p>By purchasing tickets through our service, you agree to the following terms:</p>

        <h4>Ticket Purchases</h4>
        <ul>
          <li>All ticket sales are final. No refunds or exchanges except in the case of event cancellation.</li>
          <li>Tickets cannot be resold for a value higher than the original purchase price.</li>
          <li>We reserve the right to cancel tickets purchased through unauthorized resellers.</li>
          <li>Tickets are valid only for the specific date, time, and seat indicated.</li>
        </ul>

        <h4>Event Policies</h4>
        <ul>
          <li>Late arrivals may result in seating delays or restrictions.</li>
          <li>Photography and recording may be prohibited during performances.</li>
          <li>The venue reserves the right to refuse entry without refund for disruptive behavior.</li>
        </ul>

        <h4>Liability</h4>
        <p>
          We are not responsible for lost, stolen, or damaged tickets. In the event of cancellation, liability is
          limited to the refund of the ticket purchase price.
        </p>
      </div>
      <template #footer>
        <Button label="Close" icon="pi pi-times" @click="showTermsDialog = false" class="p-button-text" />
        <Button label="Accept" icon="pi pi-check" @click="acceptTerms" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showPrivacyDialog" header="Privacy Policy" :modal="true" class="w-full max-w-2xl">
      <div class="prose prose-sm max-w-none">
        <h3>Privacy Policy</h3>
        <p>This privacy policy explains how we collect, use, and protect your personal information:</p>

        <h4>Information Collection</h4>
        <p>
          We collect information including your name, email, phone number, and payment details for ticket processing and
          delivery.
        </p>

        <h4>How We Use Your Information</h4>
        <ul>
          <li>Process ticket purchases and send confirmations</li>
          <li>Communicate important information about your purchased event</li>
          <li>Improve our services and customer experience</li>
          <li>Send marketing communications if you have opted in</li>
        </ul>

        <h4>Information Security</h4>
        <p>
          We implement security measures to protect your personal information. Payment processing is handled by secure
          third-party providers.
        </p>

        <h4>Data Retention</h4>
        <p>
          We retain your information for as long as necessary to provide services and comply with legal obligations.
        </p>

        <h4>Your Rights</h4>
        <p>
          You have the right to access, correct, or delete your personal information. You may opt out of marketing
          communications at any time.
        </p>
      </div>
      <template #footer>
        <Button label="Close" icon="pi pi-times" @click="showPrivacyDialog = false" class="p-button-text" />
        <Button label="Accept" icon="pi pi-check" @click="acceptPrivacy" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useStripeService } from '~/composables/useStripeService';
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { formatPrice, calculateServiceFee, createReservationTimer } from '~/utils/stripe';

// Get reservation token from route
const route = useRoute();
const router = useRouter();
const toast = useToast();
const token = route.params.token;

const stripeService = useStripeService();

// State for reservation and checkout
const reservation = ref({
  id: '',
  token: '',
  show_id: '',
  show_name: '',
  show_date: '',
  show_time: '',
  show_location: '',
  ticket_price_in_cents: 0,
  expires_at: '',
  seats: []
});

const loading = ref(true);
const stripeLoaded = ref(false);
const stripe = ref(null);
const elements = ref(null);
const paymentElement = ref(null);
const stripePublicKey = ref('');
const clientSecret = ref('');
const stripeReady = ref(false);
const stripeLoading = ref(true);
const loadingMessage = ref('Initializing payment system...');
const stripeElementRef = ref(null);
const isPaymentProcessing = ref(false);
const paymentError = ref('');
const reservationTimer = ref(null);
const showReservationTimer = ref(false);
const reservationTimeRemaining = ref('30:00');
const showPurchaseCompleteDialog = ref(false);
const showTermsDialog = ref(false);
const showPrivacyDialog = ref(false);
const purchaseComplete = ref({
  orderNumber: '',
  customerName: '',
  email: '',
  ticketCount: 0
});

// Form validation errors
const firstNameError = ref('');
const lastNameError = ref('');
const emailError = ref('');
const termsError = ref('');
const privacyError = ref('');

// Form state
const checkoutForm = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  specialRequests: '',
  acceptTerms: false,
  acceptPrivacy: false,
  optInMarketing: false
});

// Computed properties
const subtotal = computed(() => {
  if (!reservation.value.seats || reservation.value.seats.length === 0) return 0;

  return reservation.value.seats.reduce((sum, seat) => {
    const price = seat.price_in_cents || reservation.value.ticket_price_in_cents || 0;
    return sum + price;
  }, 0);
});

const serviceFee = computed(() => {
  // Calculate service fee (e.g., 5% of subtotal)
  return calculateServiceFee(subtotal.value);
});

const total = computed(() => {
  return subtotal.value + serviceFee.value;
});

const isReservationExpired = computed(() => {
  if (!reservation.value.expires_at) return false;
  return new Date(reservation.value.expires_at) < new Date();
});

const isSubmitDisabled = computed(() => {
  return isPaymentProcessing.value || isReservationExpired.value || !stripeLoaded.value;
});

// Lifecycle hooks
onMounted(async () => {
  await fetchReservation();

  if (!isReservationExpired.value) {
    // Get Stripe publishable key from environment variable
    const { data: keyData } = await useFetch('/api/config/stripe-key');

    if (!keyData.value || !keyData.value.publishableKey) {
      console.error('Failed to get Stripe API key', keyData.value);
      throw new Error('Failed to get Stripe API key');
    }

    stripePublicKey.value = keyData.value.publishableKey;
    console.log(`Got Stripe key: ${stripePublicKey.value.substring(0, 8)}...`);

    // Create payment intent on server to get clientSecret
    const { data: intentData, error: intentError } = await useFetch('/api/payments/create-intent', {
      method: 'POST',
      body: {
        reservation_token: token,
        amount: total.value,
        currency: 'usd',
        payment_method_types: ['card']
      }
    });

    if (intentError.value) {
      throw new Error(intentError.value.message || 'Failed to create payment intent');
    }

    if (!intentData.value || !intentData.value.clientSecret) {
      throw new Error('Failed to get client secret for payment');
    }

    clientSecret.value = intentData.value.clientSecret;
    console.log(`Got client secret: ${clientSecret.value.substring(0, 10)}...`);

    // Signal that Stripe can now be initialized
    stripeReady.value = true;
    console.log('Stripe setup complete, ready to initialize component');
    // startReservationTimer();
  }
});

onBeforeUnmount(() => {
  if (reservationTimer.value) {
    reservationTimer.value.stop();
  }

  // Clean up Stripe elements
  if (elements.value) {
    elements.value = null;
  }
});

// Methods
async function fetchReservation() {
  loading.value = true;

  try {
    const { data, error } = await useFetch(`/api/reservations/${token}`);

    if (error.value) throw new Error(error.value.message);

    if (!data.value || !data.value.reservation) {
      throw new Error('Reservation not found');
    }

    reservation.value = data.value.reservation;

    // Fill in email if provided in reservation
    if (reservation.value.email && reservation.value.email !== 'pending@example.com') {
      checkoutForm.value.email = reservation.value.email;
    }
  } catch (error) {
    console.error('Error fetching reservation:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load reservation',
      life: 5000
    });
  } finally {
    loading.value = false;
  }
}

function handleStripeError(error) {
  console.error('Stripe payment element error:', error);
  loadingMessage.value = 'There was a problem loading the payment form. Please refresh the page.';
  // Show error to user
}

function handleStripeReady(stripeData) {
  console.log('Stripe payment element is ready');
  stripeLoading.value = false;
  stripeLoaded.value = true;
  
  // Verify that the stripe service is accessible
  console.log('Checking Stripe service state:', {
    stripeAvailable: !!stripeService.stripe.value,
    elementsAvailable: !!stripeService.elements.value,
    isInitialized: stripeService.isInitialized.value
  });
}

function handlePaymentResult(result) {
  const { error, paymentIntent } = result;

  if (error) {
    throw new Error(error.message || 'Payment failed');
  } else if (paymentIntent && paymentIntent.status === 'succeeded') {
    // Extract the payment intent ID
    const paymentIntentId = paymentIntent.id;
    return createOrder(paymentIntentId);
  } else {
    // Extract the payment intent ID from the client secret
    const paymentIntentId = clientSecret.value.split('_secret_')[0];
    return createOrder(paymentIntentId);
  }
}

function handleStripeLoading(status) {
  console.log('Stripe loading status:', status);

  // Update loading message based on status
  if (status === 'loading-stripe') {
    loadingMessage.value = 'Loading payment system...';
  } else if (status === 'creating-elements') {
    loadingMessage.value = 'Preparing payment form...';
  } else if (status === 'mounting') {
    loadingMessage.value = 'Setting up payment form...';
  } else if (status.includes('error')) {
    loadingMessage.value = 'There was a problem loading the payment form. Please refresh.';
  }
}

// Process payment function
async function processPayment() {
  // Validate form first
  if (!validateForm()) {
    const firstError = document.querySelector('.p-error');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  // First set the processing state to true to prevent unmounting
  isPaymentProcessing.value = true;
  paymentError.value = '';
  
  try {
    console.log('Processing payment...');
    
    // Method 1: Try to use the service directly
    if (stripeService.stripe.value && stripeService.elements.value) {
      console.log('Using stripe service directly for payment');
      
      const result = await stripeService.confirmPayment({
        elements: stripeService.elements.value,
        confirmParams: {
          return_url: window.location.origin + '/public/tickets/success',
          payment_method_data: {
            billing_details: {
              name: `${checkoutForm.value.firstName} ${checkoutForm.value.lastName}`,
              email: checkoutForm.value.email,
              phone: checkoutForm.value.phone
            }
          }
        },
        redirect: 'if_required'
      });
      
      handlePaymentResult(result);
      
    } 
    // Method 2: Fallback to component ref if service isn't initialized
    else if (stripeElementRef.value && stripeElementRef.value.confirmPayment) {
      console.log('Using component confirmPayment method');
      
      const result = await stripeElementRef.value.confirmPayment({
        confirmParams: {
          return_url: window.location.origin + '/public/tickets/success',
          payment_method_data: {
            billing_details: {
              name: `${checkoutForm.value.firstName} ${checkoutForm.value.lastName}`,
              email: checkoutForm.value.email,
              phone: checkoutForm.value.phone
            }
          }
        },
        redirect: 'if_required'
      });
      
      handlePaymentResult(result);
    } 
    // Method 3: Last resort - try to get Stripe instances from component and use them directly
    else if (stripeElementRef.value) {
      console.log('Using stripe and elements from component');
      
      const stripeInstance = stripeElementRef.value.stripe();
      const elementsInstance = stripeElementRef.value.elements();
      
      if (!stripeInstance || !elementsInstance) {
        throw new Error('Payment system not properly loaded. Please refresh the page.');
      }
      
      const result = await stripeInstance.confirmPayment({
        elements: elementsInstance,
        confirmParams: {
          return_url: window.location.origin + '/public/tickets/success',
          payment_method_data: {
            billing_details: {
              name: `${checkoutForm.value.firstName} ${checkoutForm.value.lastName}`,
              email: checkoutForm.value.email,
              phone: checkoutForm.value.phone
            }
          }
        },
        redirect: 'if_required'
      });
      
      handlePaymentResult(result);
    } else {
      throw new Error('Payment system is not ready. Please refresh and try again.');
    }
  } catch (error) {
    console.error('Payment error:', error);
    paymentError.value = error.message || 'Payment failed. Please try again.';

    toast.add({
      severity: 'error',
      summary: 'Payment Failed',
      detail: paymentError.value,
      life: 5000
    });
  } finally {
    isPaymentProcessing.value = false;
  }
}

function startReservationTimer() {
  if (!reservation.value.expires_at) return;

  const expiryTime = new Date(reservation.value.expires_at).getTime();
  const now = new Date().getTime();
  const timeRemaining = Math.max(0, expiryTime - now);

  if (timeRemaining <= 0) {
    // Already expired
    return;
  }

  showReservationTimer.value = true;

  // Create and start the reservation timer
  reservationTimer.value = createReservationTimer(
    Math.floor(timeRemaining / (60 * 1000)), // minutes remaining
    handleReservationExpired,
    (timeFormatted) => {
      reservationTimeRemaining.value = timeFormatted;
    }
  );

  reservationTimer.value.start();
}

function handleReservationExpired() {
  toast.add({
    severity: 'error',
    summary: 'Reservation Expired',
    detail: 'Your seat reservation has expired',
    life: 5000
  });

  // Reload to show expired state
  window.location.reload();
}

function validateForm() {
  let isValid = true;

  // Reset errors
  firstNameError.value = '';
  lastNameError.value = '';
  emailError.value = '';
  termsError.value = '';
  privacyError.value = '';

  // Validate first name
  if (!checkoutForm.value.firstName.trim()) {
    firstNameError.value = 'First name is required';
    isValid = false;
  }

  // Validate last name
  if (!checkoutForm.value.lastName.trim()) {
    lastNameError.value = 'Last name is required';
    isValid = false;
  }

  // Validate email
  if (!checkoutForm.value.email.trim()) {
    emailError.value = 'Email is required';
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutForm.value.email.trim())) {
    emailError.value = 'Please enter a valid email address';
    isValid = false;
  }

  // Validate terms agreement
  if (!checkoutForm.value.acceptTerms) {
    termsError.value = 'You must accept the terms and conditions';
    isValid = false;
  }

  // Validate privacy agreement
  if (!checkoutForm.value.acceptPrivacy) {
    privacyError.value = 'You must accept the privacy policy';
    isValid = false;
  }

  return isValid;
}

async function createOrder(paymentIntentId) {
  try {
    console.log('Creating order with reservation token:', token);
    const { data, error } = await useFetch('/api/orders', {
      method: 'POST',
      body: {
        reservation_token: token,
        payment_intent_id: paymentIntentId,
        customer_name: `${checkoutForm.value.firstName} ${checkoutForm.value.lastName}`,
        email: checkoutForm.value.email,
        phone: checkoutForm.value.phone,
        special_requests: checkoutForm.value.specialRequests,
        opt_in_marketing: checkoutForm.value.optInMarketing
      }
    });

    console.log('Order API response:', data.value, error.value);

    if (error.value) throw new Error(error.value.message);

    if (!data.value || !data.value.order) {
      throw new Error('Failed to create order');
    }

    // Show success dialog
    purchaseComplete.value = {
      orderNumber: data.value.order.id.substring(0, 8).toUpperCase(),
      customerName: `${checkoutForm.value.firstName} ${checkoutForm.value.lastName}`,
      email: checkoutForm.value.email,
      ticketCount: reservation.value.seats.length
    };

    showPurchaseCompleteDialog.value = true;
    isPaymentProcessing.value = false;

    // Clear reservation token from localStorage
    localStorage.removeItem('current_reservation_token');
  } catch (error) {
    console.error('Error creating order:', error);
    paymentError.value = error.message || 'Failed to complete your order. Please contact support.';
    isPaymentProcessing.value = false;
  }
}

function acceptTerms() {
  checkoutForm.value.acceptTerms = true;
  showTermsDialog.value = false;
}

function acceptPrivacy() {
  checkoutForm.value.acceptPrivacy = true;
  showPrivacyDialog.value = false;
}

function navigateToTickets() {
  router.push('/public/tickets');
}

function navigateToHome() {
  router.push('/public/recitals');
}

function addToCalendar() {
  // Generate calendar file (iCal format)
  const event = {
    title: reservation.value.show_name,
    start: new Date(`${reservation.value.show_date}T${reservation.value.show_time}`),
    duration: { hours: 2 }, // Approximate duration
    location: reservation.value.show_location,
    description: `Your tickets for ${reservation.value.show_name}. Order #${purchaseComplete.value.orderNumber}`
  };

  // Create calendar download (simplified implementation)
  const icsContent = generateIcsFile(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${reservation.value.show_name.replace(/\s+/g, '-')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function generateIcsFile(event) {
  const formatDate = (date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const start = formatDate(event.start);
  const end = formatDate(new Date(event.start.getTime() + event.duration.hours * 60 * 60 * 1000));

  return `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
BEGIN:VEVENT
SUMMARY:${event.title}
DTSTART:${start}
DTEND:${end}
LOCATION:${event.location || ''}
DESCRIPTION:${event.description || ''}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
}

// Helper functions
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatTime(timeString) {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours));
  date.setMinutes(parseInt(minutes));
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
</script>

<style scoped>
/* Styling for the Payment Element */
#payment-element {
  min-height: 100px;
  padding: 16px;
  background-color: white;
  border-radius: 4px;
  margin-bottom: 16px;
}

#payment-form {
  width: 100%;
}

#payment-element iframe {
  width: 100% !important;
  min-height: 20px !important;
}

/* Make sure the payment message is visible */
#payment-message {
  color: #df1b41;
  font-size: 14px;
  line-height: 20px;
  padding-top: 12px;
  text-align: center;
}

/* Ensure form stays visible */
form {
  width: 100%;
  align-self: center;
  box-shadow: 0px 0px 0px 0.5px rgba(50, 50, 93, 0.1), 0px 2px 5px 0px rgba(50, 50, 93, 0.1),
    0px 1px 1.5px 0px rgba(0, 0, 0, 0.07);
  border-radius: 7px;
  padding: 40px;
}

#payment-element {
  min-height: 200px !important;
  height: auto !important;
  padding: 16px !important;
  background-color: white !important;
  border: 1px solid #ccc !important;
  border-radius: 4px !important;
  margin-bottom: 16px !important;
  position: relative !important;
  overflow: visible !important;
  display: block !important;
}

#payment-element iframe {
  height: 100% !important;
  min-height: 200px !important;
  width: 100% !important;
  position: relative !important;
  z-index: 999 !important;
  opacity: 1 !important;
  display: block !important;
}

/* This is important - add a wrapper div */
.payment-element-wrapper {
  position: relative !important;
  min-height: 200px !important;
  width: 100% !important;
  display: block !important;
  margin-bottom: 20px !important;
}
</style>