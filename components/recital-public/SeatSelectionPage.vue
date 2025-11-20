<!-- pages/public/recitals/[id]/seating.vue -->
<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center">
          <NuxtLink :to="`/public/recitals/${showId}`" class="text-primary-600 mr-2">
            <i class="pi pi-arrow-left"></i> Back to Show Details
          </NuxtLink>
        </div>

        <!-- Real-time Connection Status Badge -->
        <div class="flex items-center gap-2">
          <div v-if="isSubscribed && connectionStatus === 'connected'" class="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
            <i class="pi pi-circle-fill" style="font-size: 0.5rem"></i>
            <span>Live updates active</span>
          </div>
          <div v-else-if="connectionStatus === 'reconnecting'" class="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
            <i class="pi pi-spin pi-spinner" style="font-size: 0.5rem"></i>
            <span>Reconnecting...</span>
          </div>
          <div v-else-if="connectionStatus === 'error'" class="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
            <i class="pi pi-exclamation-triangle" style="font-size: 0.5rem"></i>
            <span>Connection lost</span>
          </div>
        </div>
      </div>
      <h1 class="text-3xl font-bold">Ticket Selection</h1>
      <p v-if="show.name" class="text-gray-600 mt-1">
        {{ show.name }} - {{ formatDate(show.date) }} at {{ formatTime(show.start_time) }}
      </p>
      <p v-if="show.location" class="text-gray-600">
        {{ show.location }}
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl"></i>
      <p class="mt-2">Loading ticket information...</p>
    </div>

    <!-- No Seats Available -->
    <div v-else-if="!hasAvailableSeats" class="card p-6 text-center">
      <i class="pi pi-exclamation-triangle text-5xl text-yellow-500 mb-4"></i>
      <h2 class="text-2xl font-bold mb-2">No Seats Available</h2>
      <p class="mb-4">We're sorry, but there are no seats available for this performance.</p>
      <NuxtLink to="/public/recitals">
        <Button label="Browse Other Shows" icon="pi pi-search" />
      </NuxtLink>
    </div>

    <!-- Initial Selection Form -->
    <div v-else-if="!showSeatMap && !processingAutoSelect" class="card p-6 max-w-2xl mx-auto">
      <h2 class="text-xl font-bold mb-4">Select Tickets</h2>

      <div class="mb-6">
        <label for="ticket-count" class="block text-sm font-medium mb-2">How many tickets would you like?</label>
        <div class="flex items-center">
          <Button
            icon="pi pi-minus"
            class="p-button-outlined rounded-r-none"
            @click="decrementTickets"
            :disabled="ticketCount <= 1"
          />
          <InputNumber
            id="ticket-count"
            v-model="ticketCount"
            showButtons
            :min="1"
            :max="maxTickets"
            class="w-20 mx-auto"
          />
          <Button
            icon="pi pi-plus"
            class="p-button-outlined rounded-l-none"
            @click="incrementTickets"
            :disabled="ticketCount >= maxTickets"
          />
        </div>
        <small class="text-gray-600">Maximum {{ maxTickets }} tickets per order</small>
      </div>

      <div class="mb-6">
        <label class="block text-sm font-medium mb-2">Seating preferences</label>
        <div class="space-y-3">
          <CommonRadioButton v-model="seatPreference" inputId="pref-best" name="seat-preference" value="best">
            Best available seats (recommended)
          </CommonRadioButton>
          <CommonRadioButton v-model="seatPreference" inputId="pref-select" name="seat-preference" value="select">
            I'll select my own seats
          </CommonRadioButton>
        </div>
      </div>

      <div class="mb-6" v-if="hasOtherShows">
        <div class="p-4 bg-blue-50 rounded-lg">
          <h3 class="font-medium text-blue-800 mb-2">Looking for tickets to multiple shows?</h3>
          <div class="field-checkbox">
            <Checkbox v-model="includeOtherShows" inputId="include-other" binary />
            <label for="include-other" class="ml-2 text-blue-700">
              Check for available seats in other similar shows
            </label>
          </div>
          <p class="text-sm text-blue-600 mt-2" v-if="includeOtherShows">
            We'll suggest the best seats across all available shows
          </p>
        </div>
      </div>

      <div class="flex justify-end mt-6">
        <Button v-if="seatPreference === 'best'" label="Find Best Seats" icon="pi pi-star" @click="findBestSeats" />
        <Button v-else label="Select My Seats" icon="pi pi-search" @click="showSeatMap = true" />
      </div>
    </div>

    <!-- Auto Select Processing -->
    <div v-else-if="processingAutoSelect" class="card p-6 text-center">
      <i class="pi pi-spin pi-spinner text-4xl mb-4"></i>
      <h2 class="text-xl font-bold mb-2">Finding the Best Seats</h2>
      <p>We're finding the best available seats for you...</p>
    </div>

    <!-- Seat Selection Map -->
    <div v-else-if="showSeatMap" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Seat Chart (Main Content) -->
      <div class="lg:col-span-2 order-2 lg:order-1">
        <div class="card p-0 overflow-hidden">
          <!-- Controls -->
          <div class="bg-gray-100 p-4 flex flex-wrap items-center justify-between gap-2">
            <div class="flex gap-3">
              <Button v-tooltip.top="'Reset selection'" icon="pi pi-refresh" @click="resetSelection" />
            </div>

            <div class="flex gap-2 items-center">
              <Checkbox v-model="showHandicapOnly" inputId="handicap-filter" binary />
              <label for="handicap-filter" class="text-sm">Accessible Seats Only</label>
            </div>
          </div>

          <!-- Theater Overview Map -->
          <SeatingTheaterOverview :selectedSection="activeSection" @select-section="setActiveSection" />

          <!-- Simplified Theater Layout -->
          <div class="relative">
            <!-- Stage Area -->
            <div class="bg-gray-800 text-white text-center py-4 font-semibold">STAGE</div>

            <!-- Seat Map Container -->
            <div class="p-4 overflow-auto" style="min-height: 400px; max-height: 600px">
              <div v-if="filteredSeats.length === 0" class="text-center py-8">
                <i class="pi pi-exclamation-circle text-3xl text-yellow-500"></i>
                <p class="mt-2">No seats available in the selected section</p>
                <Button
                  class="mt-4"
                  label="Return to Ticket Selection"
                  icon="pi pi-arrow-left"
                  @click="showSeatMap = false"
                />
              </div>

              <div v-else>
                <!-- Sections - Only show active section on mobile, show all or active on desktop -->
                <div v-if="isMobile">
                  <SeatingSectionSeats
                    v-if="activeSectionData"
                    :section="activeSectionData"
                    :selectedSeats="selectedSeats"
                    :sectionType="activeSection"
                    @select-seat="toggleSeatSelection"
                  />
                  <p v-else class="text-center text-gray-500 my-4">
                    Please select a section from the theater map above
                  </p>
                </div>

                <div v-else>
                  <SeatingSectionSeats
                    v-for="(section, type) in sectionsByType"
                    :key="type"
                    v-show="!activeSection || activeSection === type"
                    :section="section"
                    :selectedSeats="selectedSeats"
                    :sectionType="type"
                    @select-seat="toggleSeatSelection"
                  />
                </div>
              </div>
            </div>

            <!-- Legend -->
            <div class="p-4 border-t border-gray-200">
              <div class="flex flex-wrap gap-4">
                <div class="flex items-center">
                  <div class="seat-sample available"></div>
                  <span class="text-sm">Available</span>
                </div>
                <div class="flex items-center">
                  <div class="seat-sample selected"></div>
                  <span class="text-sm">Selected</span>
                </div>
                <div class="flex items-center">
                  <div class="seat-sample unavailable"></div>
                  <span class="text-sm">Unavailable</span>
                </div>
                <div class="flex items-center">
                  <div class="seat-sample accessible"></div>
                  <span class="text-sm">Accessible</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ticket Summary and Actions (Sidebar) -->
      <div class="lg:col-span-1 order-1 lg:order-2">
        <div class="card sticky top-4">
          <div v-if="showReservationTimer" class="mb-4">
            <TicketReservationTimer
              :duration="10"
              :warningThreshold="3"
              :criticalThreshold="1"
              @expire="handleReservationExpired"
              @warning="() => {}"
              @critical="() => {}"
            />
          </div>
          <h2 class="text-xl font-bold mb-4">Selected Seats</h2>

          <div v-if="selectedSeats.length === 0" class="bg-gray-50 rounded p-4 text-center text-gray-500">
            <i class="pi pi-ticket text-3xl mb-2"></i>
            <p>No seats selected.</p>
            <p class="text-sm mt-1">Select seats from the seating chart</p>
            <div class="mt-4">
              <Button
                label="Find Best Seats"
                icon="pi pi-star"
                class="p-button-outlined"
                @click="showSeatMap = false"
              />
            </div>
          </div>

          <div v-else>
            <ul class="mb-4 divide-y">
              <li v-for="seat in selectedSeats" :key="seat.id" class="py-2 flex justify-between">
                <div>
                  <span class="font-medium">{{ seat.section }} - Row {{ seat.row_name }}</span>
                  <div class="text-sm text-gray-600">Seat {{ seat.seat_number }}</div>
                  <div v-if="seat.handicap_access" class="text-xs text-blue-600">Accessible Seat</div>
                </div>
                <div>
                  <div class="text-right font-medium">
                    ${{ formatPrice(seat.price_in_cents || show.ticket_price_in_cents) }}
                  </div>
                  <Button
                    icon="pi pi-times"
                    class="p-button-text p-button-sm p-button-danger"
                    @click="removeSeat(seat)"
                  />
                </div>
              </li>
            </ul>

            <div class="border-t border-gray-200 pt-4 mb-4">
              <div class="flex justify-between font-semibold">
                <span>Total ({{ selectedSeats.length }} tickets):</span>
                <span>${{ formatPrice(totalPrice) }}</span>
              </div>
            </div>

            <div class="space-y-2">
              <!-- Add to Cart Button -->
              <Button
                v-if="!isShowInCart(showId)"
                label="Add to Cart"
                icon="pi pi-shopping-cart"
                class="w-full"
                outlined
                @click="handleAddToCart"
                :disabled="!isSelectionValid"
              />

              <!-- Update Cart Button (if show already in cart) -->
              <Button
                v-else
                label="Update Cart"
                icon="pi pi-refresh"
                class="w-full"
                outlined
                severity="info"
                @click="handleUpdateCart"
                :disabled="!isSelectionValid"
              />

              <!-- Checkout Now Button -->
              <Button
                label="Checkout Now"
                icon="pi pi-arrow-right"
                iconPos="right"
                class="w-full"
                @click="proceedToCheckout"
                :disabled="!isSelectionValid"
              />

              <div v-if="showReservationTimer" class="mt-4 text-xs flex items-center justify-center">
                <i class="pi pi-clock mr-1"></i>
                <span>
                  Your seat reservation expires in
                  <span class="font-bold" :class="{ 'text-red-600': reservationExpiring }">{{
                    reservationTimeRemaining
                  }}</span>
                </span>
              </div>

              <div v-if="!isSelectionValid" class="text-xs text-red-600 text-center">
                Please select exactly {{ ticketCount }} seats
              </div>

              <p class="text-xs text-gray-500 text-center">
                Add to cart or checkout immediately to reserve your seats.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Best Seats Result Modal -->
    <Dialog
      v-model:visible="showBestSeatsResult"
      header="We Found Great Seats!"
      :modal="true"
      :closable="false"
      class="w-full max-w-lg"
    >
      <div>
        <div class="bg-gray-50 p-3 rounded-lg mt-4 mb-2">
          <div class="flex items-center">
            <i class="pi pi-info-circle text-blue-500 mr-2"></i>
            <p class="text-sm">
              Seats will be reserved for <strong>10 minutes</strong> after selecting "Proceed to Checkout"
            </p>
          </div>
        </div>
        <!-- Add visual seat map preview here -->
        <div class="mb-4 border rounded p-3">
          <h3 class="font-medium mb-2">Seat Location Preview</h3>

          <!-- Simple theater layout preview -->
          <div class="relative bg-gray-100 p-4 rounded">
            <!-- Stage Area -->
            <div class="bg-gray-800 text-white text-center py-2 font-semibold text-sm mb-4">STAGE</div>

            <!-- Simplified seat map -->
            <div class="flex justify-center">
              <SeatingTheaterOverview :selectedSection="bestSeatsSection" :highlightOnly="true" />
            </div>
          </div>

          <!-- List of seats with better formatting -->
          <div class="mt-3">
            <div v-if="bestSeatsInSameSection && bestSeatsConsecutive" class="text-green-600 text-sm mb-2">
              <i class="pi pi-check-circle"></i>
              These seats are consecutive in the same section
            </div>
            <div v-else-if="bestSeatsInSameSection" class="text-blue-600 text-sm mb-2">
              <i class="pi pi-info-circle"></i>
              These seats are in the same section but not consecutive
            </div>
            <div v-else class="text-yellow-500 text-sm mb-2">
              <i class="pi pi-exclamation-circle"></i>
              These seats are in different sections
            </div>
          </div>
        </div>

        <h3 class="font-medium mb-3">
          {{ bestSeats.length }} {{ bestSeats.length > 1 ? 'seats' : 'seat' }} found for {{ show.name }}
        </h3>

        <ul class="divide-y mb-4">
          <li v-for="seat in bestSeats" :key="seat.id" class="py-2 flex justify-between">
            <div>
              <span class="font-medium">{{ seat.section }} - Row {{ seat.row_name }}</span>
              <div class="text-sm text-gray-600">Seat {{ seat.seat_number }}</div>
              <div v-if="seat.handicap_access" class="text-xs text-blue-600">Accessible Seat</div>
            </div>
            <div class="text-right font-medium">
              ${{ formatPrice(seat.price_in_cents || show.ticket_price_in_cents) }}
            </div>
          </li>
        </ul>

        <div class="border-t border-gray-200 pt-3 mb-4">
          <div class="flex justify-between font-semibold">
            <span>Total:</span>
            <span>${{ formatPrice(bestSeatsTotal) }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between w-full">
          <Button
            label="Choose Different Seats"
            icon="pi pi-arrow-left"
            class="p-button-outlined"
            @click="cancelBestSeats"
          />
          <Button label="Proceed to Checkout" icon="pi pi-arrow-right" @click="acceptBestSeats" />
        </div>
      </template>
    </Dialog>
    <div v-if="seatPreference === 'select'" class="mt-4 bg-blue-50 p-3 rounded">
      <Button
        label="Show me the best available seats on the map"
        icon="pi pi-star"
        class="p-button-outlined p-button-info"
        @click="highlightBestSeatsOnMap"
      />
    </div>
  </div>
</template>

<script setup>
import { useWindowSize } from '@vueuse/core';
import { detectMechanicsburgConsecutiveSeats, createReservationTimer } from '~/utils/seatDetection';
const route = useRoute();
const router = useRouter();
const showId = ref(route.params.id);
const { addToCart, isShowInCart } = useShoppingCart();
const show = ref({});
const availableSeats = ref([]);
const selectedSeats = ref([]);
const loading = ref(true);
const selectedSection = ref(null);
const showHandicapOnly = ref(false);
const showSeatMap = ref(false);
const ticketCount = ref(2);
const maxTickets = 10;
const seatPreference = ref('best'); // 'best' or 'select'
const includeOtherShows = ref(false);
const hasOtherShows = ref(false);
const processingAutoSelect = ref(false);
const showBestSeatsResult = ref(false);
const bestSeats = ref([]);
const alternateShowSuggestion = ref(null);
const activeSection = ref('center');
const selectedSectionFilter = ref(null);
const bestSeatsSection = ref(null);
const reservationTimer = ref(null);
const showReservationTimer = ref(false);
const reservationTimeRemaining = ref('0:00');
const reservationExpiring = ref(false);

// Window size for responsive behavior
const { width } = useWindowSize();
const isMobile = computed(() => width.value < 768);

// Real-time seat updates
const { isSubscribed, connectionStatus, reconnectAttempts, subscribe, unsubscribe } = useRealtimeSeats(showId.value);
const showConnectionStatus = ref(false);
const realtimeUpdateCount = ref(0);

// Optimistic UI updates
const optimisticSelections = ref(new Set()); // Track seats being selected optimistically
const pendingSeatUpdates = ref(new Map()); // Track pending seat status updates

// Handle real-time seat updates
const handleSeatUpdate = (updatedSeat, eventType) => {
  console.log('[SeatSelectionPage] Real-time seat update:', eventType, updatedSeat);

  realtimeUpdateCount.value++;

  if (eventType === 'UPDATE' || eventType === 'INSERT') {
    // Find the seat in availableSeats
    const index = availableSeats.value.findIndex(seat => seat.id === updatedSeat.id);

    if (index !== -1) {
      // Update existing seat
      const oldStatus = availableSeats.value[index].status;
      availableSeats.value[index] = { ...availableSeats.value[index], ...updatedSeat };

      // If seat became unavailable, remove from selection
      if (updatedSeat.status !== 'available' && selectedSeats.value.some(s => s.id === updatedSeat.id)) {
        // Check if it's not our reservation
        const reservationToken = localStorage.getItem('current_reservation_token');
        const isOurReservation = updatedSeat.reserved_by === reservationToken;

        if (!isOurReservation) {
          // Remove from selection
          selectedSeats.value = selectedSeats.value.filter(s => s.id !== updatedSeat.id);

          // Show notification
          useToast().add({
            severity: 'warn',
            summary: 'Seat No Longer Available',
            detail: `Seat ${updatedSeat.row_name}-${updatedSeat.seat_number} was just taken by another customer.`,
            life: 5000
          });
        }
      }

      // If seat became available, show notification (if previously sold/reserved)
      if (oldStatus !== 'available' && updatedSeat.status === 'available') {
        // Optionally show a subtle notification that a seat became available
        console.log('[SeatSelectionPage] Seat became available:', updatedSeat.row_name, updatedSeat.seat_number);
      }
    } else if (updatedSeat.status === 'available') {
      // New available seat, add to list
      availableSeats.value.push(updatedSeat);
    }
  } else if (eventType === 'DELETE') {
    // Remove seat from available seats
    availableSeats.value = availableSeats.value.filter(seat => seat.id !== updatedSeat.id);

    // Remove from selection if present
    selectedSeats.value = selectedSeats.value.filter(seat => seat.id !== updatedSeat.id);
  }
};

// Handle connection status changes
const handleConnectionChange = (status) => {
  console.log('[SeatSelectionPage] Connection status changed:', status);

  if (status === 'connected') {
    showConnectionStatus.value = false;

    // If this is a reconnection, refresh seat data
    if (reconnectAttempts.value > 0) {
      useToast().add({
        severity: 'success',
        summary: 'Reconnected',
        detail: 'Real-time updates reconnected. Refreshing seat data...',
        life: 3000
      });

      // Refresh available seats after reconnection
      fetchAvailableSeats();
    }
  } else if (status === 'reconnecting') {
    showConnectionStatus.value = true;

    useToast().add({
      severity: 'warn',
      summary: 'Connection Lost',
      detail: 'Attempting to reconnect to real-time updates...',
      life: 5000
    });
  } else if (status === 'error') {
    showConnectionStatus.value = true;

    useToast().add({
      severity: 'error',
      summary: 'Connection Error',
      detail: 'Unable to maintain real-time updates. Please refresh the page.',
      life: 10000
    });
  }
};

// Fetch show and seat data on mount
onMounted(async () => {
  await fetchShowDetails();
  await fetchAvailableSeats();
  await checkOtherShows();
  loading.value = false;

  // check for existing reservation
  const reservationToken = localStorage.getItem('current_reservation_token');

  if (reservationToken) {
    await checkReservationStatus(reservationToken);
  }

  // Subscribe to real-time seat updates
  console.log('[SeatSelectionPage] Subscribing to real-time seat updates for show:', showId.value);
  subscribe(handleSeatUpdate, handleConnectionChange);
});

// Cleanup on unmount
onUnmounted(() => {
  console.log('[SeatSelectionPage] Component unmounting, unsubscribing from real-time updates');
  unsubscribe();

  // Stop reservation timer
  if (reservationTimer.value) {
    reservationTimer.value.stop();
  }
});

// Watch for filter changes when seat map is displayed
watch([selectedSection, showHandicapOnly], () => {
  if (showSeatMap.value) {
    // No need to refetch, just filter the existing seats
  }
});

// Computed properties
const hasAvailableSeats = computed(() => {
  return availableSeats.value.length > 0;
});

const sectionOptions = computed(() => {
  if (!availableSeats.value.length) return [{ name: 'All Sections' }];

  const sections = [...new Set(availableSeats.value.map((seat) => seat.section))].map((section) => ({ name: section }));

  return [{ name: 'All Sections' }, ...sections];
});

const bestSeatsAnalysis = computed(() => {
  // Only analyze if we have seats
  if (!bestSeats.value || bestSeats.value.length === 0) {
    return {
      isConsecutive: true,
      inSameSection: true,
      inSameRow: true,
      explanation: 'No seats to analyze'
    };
  }

  // Use the specialized algorithm for Mechanicsburg Auditorium
  return detectMechanicsburgConsecutiveSeats(bestSeats.value);
});

const bestSeatsInSameSection = computed(() => {
  return bestSeatsAnalysis.value.inSameSection;
});

const bestSeatsConsecutive = computed(() => {
  return bestSeatsAnalysis.value.isConsecutive;
});

//   // Check if seats are in the same row
//   const firstRow = bestSeats.value[0].row_name;
//   if (!bestSeats.value.every(seat => seat.row_name === firstRow)) return false;

//   // Sort by seat number and check if consecutive
//   const sortedSeats = [...bestSeats.value].sort((a, b) =>
//     parseInt(a.seat_number) - parseInt(b.seat_number)
//   );

//   for (let i = 0; i < sortedSeats.length - 1; i++) {
//     if (parseInt(sortedSeats[i + 1].seat_number) - parseInt(sortedSeats[i].seat_number) !== 1) {
//       return false;
//     }
//   }

//   return true;
// });

// const filteredSeats = computed(() => {
//   let seats = [...availableSeats.value];

//   if (selectedSection.value && selectedSection.value.name !== 'All Sections') {
//     seats = seats.filter((seat) => seat.section === selectedSection.value.name);
//   }

//   if (showHandicapOnly.value) {
//     seats = seats.filter((seat) => seat.handicap_access);
//   }

//   return seats;
// });

// Map sections to their theater position types
const sectionsByType = computed(() => {
  const sections = {};
  const sectionNames = [...new Set(availableSeats.value.map((seat) => seat.section))];

  // You'll need logic to map your actual section names to these positions
  // This is an example - adjust based on your actual section naming
  sectionNames.forEach((sectionName) => {
    let type = 'center'; // Default

    if (sectionName.toLowerCase().includes('left') && sectionName.toLowerCase().includes('wing')) {
      type = 'left-wing';
    } else if (sectionName.toLowerCase().includes('right') && sectionName.toLowerCase().includes('wing')) {
      type = 'right-wing';
    } else if (sectionName.toLowerCase().includes('left')) {
      type = 'left-main';
    } else if (sectionName.toLowerCase().includes('right')) {
      type = 'right-main';
    }

    // Create section data structure
    const sectionSeats = availableSeats.value.filter((seat) => seat.section === sectionName);

    // Group by row
    const rows = {};
    sectionSeats.forEach((seat) => {
      if (!rows[seat.row_name]) {
        rows[seat.row_name] = { name: seat.row_name, seats: [] };
      }
      rows[seat.row_name].seats.push(seat);
    });

    // Sort seats within rows
    Object.values(rows).forEach((row) => {
      row.seats.sort((a, b) => a.seat_number.localeCompare(b.seat_number, undefined, { numeric: true }));
    });

    sections[type] = { name: sectionName, rows };
  });

  return sections;
});

// Current active section data
const activeSectionData = computed(() => {
  if (!activeSection.value) return null;
  return sectionsByType.value[activeSection.value] || null;
});

// Set active section
function setActiveSection(section) {
  activeSection.value = section;
}

// timer management functions
function startReservationTimer() {
  // Only start if we have seats and no active timer
  if (selectedSeats.value.length === 0 || reservationTimer.value) return;

  showReservationTimer.value = true;

  // Create new timer (10 minutes as per Story 4.2 requirements)
  reservationTimer.value = createReservationTimer(
    10, // 10 minutes
    // On expire
    handleReservationExpired,
    // On update
    updateReservationDisplay
  );

  // Start the timer
  reservationTimer.value.start();
}

function updateReservationDisplay(timeFormatted, timeRemaining, isUrgent) {
  reservationTimeRemaining.value = timeFormatted;
  reservationExpiring.value = isUrgent;

  // Could update UI with timeRemaining info
  if (isUrgent) {
    // Show warning notification
    useToast().add({
      severity: 'warn',
      summary: 'Reservation Expiring',
      detail: 'Your seat reservation is about to expire. Please complete your purchase.',
      life: 10000
    });
  }
}

function handleReservationExpired() {
  reservationTimer.value = null;
  showReservationTimer.value = false;

  // Show error notification
  useToast().add({
    severity: 'error',
    summary: 'Reservation Expired',
    detail: 'Your seat reservation has expired. These seats are now available to others.',
    life: 5000
  });

  // Clear the selected seats
  selectedSeats.value = [];

  // Optionally refresh available seats
  fetchAvailableSeats();
}

function stopReservationTimer() {
  if (reservationTimer.value) {
    reservationTimer.value.stop();
    reservationTimer.value = null;
  }

  showReservationTimer.value = false;
}

// Updated filter logic
const filteredSeats = computed(() => {
  let seats = [...availableSeats.value];

  if (selectedSectionFilter.value && selectedSectionFilter.value.name !== 'All Sections') {
    seats = seats.filter((seat) => seat.section === selectedSectionFilter.value.name);
  }

  if (activeSection.value && sectionsByType.value[activeSection.value]) {
    const sectionName = sectionsByType.value[activeSection.value].name;
    seats = seats.filter((seat) => seat.section === sectionName);
  }

  if (showHandicapOnly.value) {
    seats = seats.filter((seat) => seat.handicap_access);
  }

  return seats;
});

const groupedSections = computed(() => {
  // Group filtered seats by section and row
  const sections = {};

  filteredSeats.value.forEach((seat) => {
    if (!sections[seat.section]) {
      sections[seat.section] = { name: seat.section, rows: {} };
    }

    if (!sections[seat.section].rows[seat.row_name]) {
      sections[seat.section].rows[seat.row_name] = { name: seat.row_name, seats: [] };
    }

    sections[seat.section].rows[seat.row_name].seats.push(seat);
  });

  // Convert to array and sort
  return Object.values(sections)
    .map((section) => {
      section.rows = Object.values(section.rows).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      );

      // Sort seats within each row
      section.rows.forEach((row) => {
        row.seats.sort((a, b) => a.seat_number.localeCompare(b.seat_number, undefined, { numeric: true }));
      });

      return section;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
});

const totalPrice = computed(() => {
  return selectedSeats.value.reduce((sum, seat) => {
    const price = seat.price_in_cents || show.value.ticket_price_in_cents || 0;
    return sum + price;
  }, 0);
});

const bestSeatsTotal = computed(() => {
  return bestSeats.value.reduce((sum, seat) => {
    const price = seat.price_in_cents || show.value.ticket_price_in_cents || 0;
    return sum + price;
  }, 0);
});

const isSelectionValid = computed(() => {
  return selectedSeats.value.length === ticketCount.value;
});

// Methods
async function fetchShowDetails() {
  try {
    const { data, error } = await useFetch(`/api/recital-shows/${showId.value}`);

    if (error.value) throw new Error(error.value.message);

    show.value = data.value.show;
  } catch (error) {
    console.error('Error fetching show details:', error);
    useToast().add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load show details',
      life: 3000
    });
  }
}

async function fetchAvailableSeats() {
  try {
    const { data, error } = await useFetch(`/api/recital-shows/${showId.value}/seats/available`);

    if (error.value) throw new Error(error.value.message);

    availableSeats.value = data.value.available_seats || [];
  } catch (error) {
    console.error('Error fetching available seats:', error);
    useToast().add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load available seats',
      life: 3000
    });
  }
}

async function checkOtherShows() {
  try {
    // Only check for other shows with the same name but different dates
    if (!show.value.series_id) return;

    const { data, error } = await useFetch('/api/recital-shows', {
      params: {
        series_id: show.value.series_id,
        exclude_id: show.value.id,
        has_available_seats: true
      }
    });

    if (error.value) throw new Error(error.value.message);

    hasOtherShows.value = data.value.shows && data.value.shows.length > 0;
  } catch (error) {
    console.error('Error checking other shows:', error);
    // Don't show an error to the user for this optional feature
  }
}

function incrementTickets() {
  if (ticketCount.value < maxTickets) {
    ticketCount.value++;
  }
}

function decrementTickets() {
  if (ticketCount.value > 1) {
    ticketCount.value--;
  }
}

async function findBestSeats() {
  processingAutoSelect.value = true;
  bestSeats.value = [];
  alternateShowSuggestion.value = null;
  bestSeatsSection.value = null;

  try {
    // Find best seats for current show
    const { data: currentData, error: currentError } = await useFetch(
      `/api/recital-shows/${showId.value}/seats/suggested`,
      {
        params: {
          count: ticketCount.value,
          keep_together: true,
          prefer_center: true,
          handicap_access: showHandicapOnly.value
        }
      }
    );

    if (currentError.value) throw new Error(currentError.value.message);

    // Check if we found enough seats
    if (currentData.value.success) {
      bestSeats.value = currentData.value.seats;
      
      // Store the reservation token returned from the API
      if (currentData.value.reservation_token) {
        console.log('Reservation token from API:', currentData.value.reservation_token);
        localStorage.setItem('current_reservation_token', currentData.value.reservation_token);
      }

      // Determine which section to highlight
      if (bestSeats.value.length > 0) {
        // Try to set section based on the section_type from the first seat
        const firstSeat = bestSeats.value[0];

        // Convert database section_type to our section type values
        if (firstSeat.section_type) {
          bestSeatsSection.value = firstSeat.section_type;
        } else if (firstSeat.section) {
          // Fallback: try to guess section from section name
          const sectionName = firstSeat.section.toLowerCase();
          if (sectionName.includes('center')) {
            bestSeatsSection.value = 'center';
          } else if (sectionName.includes('left') && sectionName.includes('wing')) {
            bestSeatsSection.value = 'left-wing';
          } else if (sectionName.includes('right') && sectionName.includes('wing')) {
            bestSeatsSection.value = 'right-wing';
          } else if (sectionName.includes('left')) {
            bestSeatsSection.value = 'left-main';
          } else if (sectionName.includes('right')) {
            bestSeatsSection.value = 'right-main';
          } else {
            bestSeatsSection.value = 'center'; // Default
          }
        }
      }

      // Only check other shows if requested and we didn't find ideal seats
      if (
        includeOtherShows.value &&
        (!currentData.value.ideal_match || currentData.value.seats.length < ticketCount.value)
      ) {
        await checkAlternateShows();
      }
    } else if (includeOtherShows.value) {
      // If we didn't find enough seats in this show, check alternatives
      await checkAlternateShows();
    }

    // Show the results
    showBestSeatsResult.value = bestSeats.value.length > 0;

    // If no seats found in any show
    if (bestSeats.value.length === 0) {
      useToast().add({
        severity: 'warn',
        summary: 'No Seats Found',
        detail: `Couldn't find ${ticketCount.value} seats that match your criteria`,
        life: 5000
      });

      // Fall back to manual selection
      seatPreference.value = 'select';
      showSeatMap.value = true;
    }
  } catch (error) {
    console.error('Error finding best seats:', error);
    useToast().add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to find best available seats',
      life: 3000
    });

    // Fall back to manual selection
    seatPreference.value = 'select';
    showSeatMap.value = true;
  } finally {
    processingAutoSelect.value = false;
  }
}

function highlightBestSeatsOnMap() {
  // First find the best seats
  findBestSeats().then(() => {
    // Once we have the seats, show the seat map with those seats pre-selected
    if (bestSeats.value.length > 0) {
      showSeatMap.value = true;
      activeSection.value = bestSeatsSection.value;

      // Pre-select these seats
      selectedSeats.value = [...bestSeats.value];

      // Display a toast to let the user know we've selected the best seats
      useToast().add({
        severity: 'info',
        summary: 'Best Seats Selected',
        detail: `We've highlighted ${bestSeats.value.length} best available seats for you`,
        life: 5000
      });
    }
  });
}

// Modify the acceptBestSeats function to show the seats on the map
// function acceptBestSeats() {
//   // Set the selected seats to the best seats and proceed to checkout
//   selectedSeats.value = [...bestSeats.value];
//   showBestSeatsResult.value = false;
//   proceedToCheckout();
// }

// Modify the cancelBestSeats function to show the best seats on the map
function cancelBestSeats() {
  showBestSeatsResult.value = false;

  // Switch to manual selection and show the best seats on the map
  seatPreference.value = 'select';
  showSeatMap.value = true;

  // Set the active section to where the best seats are
  if (bestSeatsSection.value) {
    activeSection.value = bestSeatsSection.value;
  }

  // Pre-select the best seats to help the user locate them
  selectedSeats.value = [...bestSeats.value];

  // Display a toast to guide the user
  useToast().add({
    severity: 'info',
    summary: 'Choose Your Seats',
    detail: `We've highlighted our suggested seats. You can keep them or select different ones.`,
    life: 5000
  });
}

async function checkAlternateShows() {
  if (!show.value.series_id) return;

  try {
    // Find alternative shows with same series
    const { data: altShowsData, error: altShowsError } = await useFetch('/api/recital-shows', {
      params: {
        series_id: show.value.series_id,
        exclude_id: show.value.id,
        has_available_seats: true
      }
    });

    if (altShowsError.value) throw new Error(altShowsError.value.message);

    // Check each alternative show for seats
    for (const altShow of altShowsData.value.shows || []) {
      const { data: altSeatsData, error: altSeatsError } = await useFetch(
        `/api/recital-shows/${altShow.id}/seats/suggested`,
        {
          params: {
            count: ticketCount.value,
            keep_together: true,
            handicap_access: showHandicapOnly.value
          }
        }
      );

      if (altSeatsError.value) continue;

      // If we found better seats, suggest the alternate show
      if (
        altSeatsData.value.success &&
        altSeatsData.value.ideal_match &&
        altSeatsData.value.seats.length >= ticketCount.value
      ) {
        alternateShowSuggestion.value = {
          id: altShow.id,
          name: altShow.name,
          date: altShow.date,
          start_time: altShow.start_time
        };
        break;
      }
    }
  } catch (error) {
    console.error('Error checking alternate shows:', error);
    // Don't fail the whole process for this
  }
}

function switchToAlternateShow() {
  if (!alternateShowSuggestion.value) return;

  // Navigate to the alternate show's seating page
  navigateTo(`/public/recitals/${alternateShowSuggestion.value.id}/seating`);
}

function toggleSeatSelection(seat) {
  const index = selectedSeats.value.findIndex((s) => s.id === seat.id);

  if (index >= 0) {
    // Deselect seat
    selectedSeats.value.splice(index, 1);
    optimisticSelections.value.delete(seat.id);

    // If no more seats selected, stop the timer
    if (selectedSeats.value.length === 0) {
      stopReservationTimer();
    }
  } else {
    // Don't allow selecting more than the ticket count
    if (selectedSeats.value.length >= ticketCount.value) {
      useToast().add({
        severity: 'warn',
        summary: 'Selection Limit',
        detail: `You can only select ${ticketCount.value} seats`,
        life: 3000
      });
      return;
    }

    // Check if seat is still available (real-time check)
    const seatInAvailableList = availableSeats.value.find(s => s.id === seat.id);
    if (seatInAvailableList && seatInAvailableList.status !== 'available') {
      // Seat was just taken
      useToast().add({
        severity: 'error',
        summary: 'Seat Unavailable',
        detail: `Seat ${seat.row_name}-${seat.seat_number} is no longer available`,
        life: 3000
      });
      return;
    }

    // Optimistically select seat
    optimisticSelections.value.add(seat.id);

    // Select seat with optimistic UI (immediate feedback)
    selectedSeats.value.push({
      ...seat,
      _optimistic: true // Flag to indicate this is an optimistic selection
    });

    // Start the timer if this is the first seat selected
    if (selectedSeats.value.length === 1) {
      startReservationTimer();
    }

    // After a short delay, confirm the selection (simulate server response)
    // In a real implementation, you would make an API call here to reserve the seat
    setTimeout(() => {
      optimisticSelections.value.delete(seat.id);

      // Update the seat to remove the optimistic flag
      const selectedIndex = selectedSeats.value.findIndex(s => s.id === seat.id);
      if (selectedIndex !== -1) {
        selectedSeats.value[selectedIndex] = {
          ...selectedSeats.value[selectedIndex],
          _optimistic: false
        };
      }
    }, 300); // 300ms delay for visual feedback
  }
}

// Modify the acceptBestSeats method to start the timer
function acceptBestSeats() {
  // Set the selected seats to the best seats
  selectedSeats.value = [...bestSeats.value];

  // Close the best seats result modal
  showBestSeatsResult.value = false;

  // Get the reservation token that was already created by the findBestSeats function
  const reservationToken = localStorage.getItem('current_reservation_token');
  
  if (reservationToken) {
    console.log('Using existing reservation token:', reservationToken);
    
    // Navigate directly to checkout with the existing reservation token
    navigateTo(`/public/checkout/${reservationToken}`);
  } else {
    // In case the token wasn't stored properly, fall back to the original method
    console.warn('Reservation token not found, falling back to creating a new reservation');
    
    // Start reservation timer
    startReservationTimer();
    
    // Proceed to checkout
    proceedToCheckout();
  }
}

function removeSeat(seat) {
  const index = selectedSeats.value.findIndex((s) => s.id === seat.id);
  if (index >= 0) {
    selectedSeats.value.splice(index, 1);
  }
}

function resetSelection() {
  selectedSeats.value = [];
}

// function acceptBestSeats() {
//   // Set the selected seats to the best seats and proceed to checkout
//   selectedSeats.value = [...bestSeats.value];
//   showBestSeatsResult.value = false;
//   proceedToCheckout();
// }

// function cancelBestSeats() {
//   // Clear the best seats and go back to the initial view
//   bestSeats.value = [];
//   showBestSeatsResult.value = false;

//   // Switch to manual selection if they reject the automatic selection
//   seatPreference.value = 'select';
//   showSeatMap.value = true;
// }

// Handle adding seats to cart
function handleAddToCart() {
  if (selectedSeats.value.length === 0) return;
  if (selectedSeats.value.length !== ticketCount.value) {
    useToast().add({
      severity: 'warn',
      summary: 'Invalid Selection',
      detail: `Please select exactly ${ticketCount.value} seats`,
      life: 3000
    });
    return;
  }

  // Add to cart
  addToCart(show.value, selectedSeats.value);

  // Navigate back to shows list
  router.push('/public/recitals');
}

// Handle updating cart for this show
function handleUpdateCart() {
  if (selectedSeats.value.length === 0) return;
  if (selectedSeats.value.length !== ticketCount.value) {
    useToast().add({
      severity: 'warn',
      summary: 'Invalid Selection',
      detail: `Please select exactly ${ticketCount.value} seats`,
      life: 3000
    });
    return;
  }

  // Update cart
  addToCart(show.value, selectedSeats.value);

  // Navigate to cart
  router.push('/cart');
}

// In your reservation function in the seat selection page
async function proceedToCheckout() {
  if (selectedSeats.value.length === 0) return;
  if (selectedSeats.value.length !== ticketCount.value) {
    useToast().add({
      severity: 'warn',
      summary: 'Invalid Selection',
      detail: `Please select exactly ${ticketCount.value} seats`,
      life: 3000
    });
    return;
  }

  try {
    // Create reservation
    const seatIds = selectedSeats.value.map((seat) => seat.id);

    // Log seat IDs for debugging
    console.log('Attempting to reserve seats:', seatIds);

    const { data, error } = await useFetch(`/api/recital-shows/${showId.value}/seats/reserve`, {
      method: 'POST',
      body: {
        seat_ids: seatIds,
        email: '', // Will be collected during checkout
        phone: '' // Will be collected during checkout
      }
    });

    // Improved error handling - log entire response
    console.log('Reservation response:', { data: data.value, error: error.value });

    if (error.value) {
      // More robust error extraction
      const errorMessage = error.value.data?.statusMessage || 
                         error.value.message || 
                         'Failed to reserve seats';
                         
      console.error('Reservation error details:', error.value);
      
      // Always show toast for any error
      useToast().add({
        severity: 'error',
        summary: 'Reservation Failed',
        detail: errorMessage,
        life: 5000
      });
      
      throw new Error(errorMessage);
    }

    // Check if we got a valid response with a token
    if (!data.value || !data.value.reservation || !data.value.reservation.token) {
      throw new Error('Invalid response from server - missing reservation token');
    }

    // Store token and navigate
    localStorage.setItem('current_reservation_token', data.value.reservation.token);
    navigateTo(`/public/checkout/${data.value.reservation.token}`);
    
  } catch (error) {
    console.error('Error creating reservation:', error);
    
    // Make sure we always show an error toast
    useToast().add({
      severity: 'error',
      summary: 'Reservation Error',
      detail: error.message || 'Failed to reserve seats. Please try again.',
      life: 5000
    });
  }
}

// Helper methods
function getSeatClasses(seat) {
  const isSelected = selectedSeats.value.some((s) => s.id === seat.id);

  const classes = [];

  if (isSelected) {
    classes.push('selected');
  } else {
    classes.push('available');
  }

  if (seat.handicap_access) {
    classes.push('accessible');
  }

  return classes.join(' ');
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
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

function formatPrice(cents) {
  if (!cents && cents !== 0) return '0.00';
  return (cents / 100).toFixed(2);
}
</script>

<style scoped>
.seat-container {
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.seat {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.seat.available {
  background-color: #e5e7eb;
  color: #374151;
}

.seat.available:hover {
  background-color: #d1d5db;
}

.seat.selected {
  background-color: #3b82f6;
  color: white;
}

.seat.unavailable {
  background-color: #fecaca;
  color: #991b1b;
  cursor: not-allowed;
  opacity: 0.7;
}

.seat.accessible {
  border: 2px solid #10b981;
}

.seat-sample {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  margin-right: 6px;
}

.seat-sample.available {
  background-color: #e5e7eb;
}

.seat-sample.selected {
  background-color: #3b82f6;
}

.seat-sample.unavailable {
  background-color: #fecaca;
}

.seat-sample.accessible {
  background-color: #fff;
  border: 2px solid #10b981;
}

.custom-radio-container {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.custom-radio-input {
  position: absolute;
  opacity: 0;
}

.custom-radio-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.custom-radio-button {
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  margin-right: 0.5rem;
  position: relative;
  transition: all 0.2s;
}

.custom-radio-button::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: white;
  transition: transform 0.2s;
}

.custom-radio-input:checked + .custom-radio-label .custom-radio-button {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

.custom-radio-input:checked + .custom-radio-label .custom-radio-button::after {
  transform: translate(-50%, -50%) scale(1);
}

.custom-radio-input:focus + .custom-radio-label .custom-radio-button {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

/* Real-time update animations */
@keyframes seatUpdate {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes seatTaken {
  0% {
    transform: scale(1);
  }
  25% {
    transform: scale(0.9) rotate(-5deg);
  }
  50% {
    transform: scale(1.1) rotate(5deg);
  }
  75% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1) rotate(0);
  }
}

@keyframes seatAvailable {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Apply animation when seat status changes */
.seat {
  animation-duration: 0.3s;
  animation-timing-function: ease-out;
}

.seat.selected {
  animation: seatUpdate 0.3s ease-out;
}

.seat.unavailable {
  animation: seatTaken 0.5s ease-out;
}

/* Optimistic selection state */
.seat.optimistic {
  background-color: #60a5fa;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* Smooth transitions for all seat states */
.seat {
  transition: background-color 0.3s ease, color 0.3s ease, opacity 0.3s ease, transform 0.2s ease;
}

/* Real-time update indicator */
.realtime-update-flash {
  position: relative;
}

.realtime-update-flash::after {
  content: '';
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  background-color: #10b981;
  border-radius: 50%;
  animation: flashIndicator 1s ease-out;
}

@keyframes flashIndicator {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
  100% {
    opacity: 0;
    transform: scale(1);
  }
}
</style>
