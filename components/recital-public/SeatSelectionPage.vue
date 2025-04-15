<!-- pages/public/recitals/[id]/seating.vue -->
<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center mb-2">
        <NuxtLink :to="`/public/recitals/${showId}`" class="text-primary-600 mr-2">
          <i class="pi pi-arrow-left"></i> Back to Show Details
        </NuxtLink>
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
          <Button v-tooltip.top="'Reset selection'" 
                  icon="pi pi-refresh"
                  @click="resetSelection" />
          
        </div>
        
        <div class="flex gap-2 items-center">
          <Checkbox v-model="showHandicapOnly" 
          inputId="handicap-filter" 
          binary />
<label for="handicap-filter" class="text-sm">Accessible Seats Only</label>
        </div>
      </div>
      
      <!-- Theater Overview Map -->
      <SeatingTheaterOverview 
        :selectedSection="activeSection" 
        @select-section="setActiveSection" />
      
      <!-- Simplified Theater Layout -->
      <div class="relative">
        <!-- Stage Area -->
        <div class="bg-gray-800 text-white text-center py-4 font-semibold">
          STAGE
        </div>
        
        <!-- Seat Map Container -->
        <div class="p-4 overflow-auto" style="min-height: 400px; max-height: 600px">
          <div v-if="filteredSeats.length === 0" class="text-center py-8">
            <i class="pi pi-exclamation-circle text-3xl text-yellow-500"></i>
            <p class="mt-2">No seats available in the selected section</p>
            <Button class="mt-4" 
                    label="Return to Ticket Selection" 
                    icon="pi pi-arrow-left" 
                    @click="showSeatMap = false" />
          </div>
          
          <div v-else>
            <!-- Sections - Only show active section on mobile, show all or active on desktop -->
            <div v-if="isMobile">
              <SeatingSectionSeats 
                v-if="activeSectionData"
                :section="activeSectionData" 
                :selectedSeats="selectedSeats"
                :sectionType="activeSection"
                @select-seat="toggleSeatSelection" />
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
                @select-seat="toggleSeatSelection" />
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
              <Button
                label="Proceed to Checkout"
                icon="pi pi-arrow-right"
                class="w-full"
                @click="proceedToCheckout"
                :disabled="!isSelectionValid"
              />

              <div v-if="!isSelectionValid" class="text-xs text-red-600 text-center">
                Please select exactly {{ ticketCount }} seats
              </div>

              <p class="text-xs text-gray-500 text-center">
                Selected seats will be held for 30 minutes during checkout.
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
        <div v-if="alternateShowSuggestion" class="bg-blue-50 p-4 rounded-lg mb-4">
          <h3 class="font-medium text-blue-800 mb-2">Better Seats Available!</h3>
          <p class="text-blue-700 mb-2">We found better seats at a different show time:</p>
          <div class="font-medium">{{ alternateShowSuggestion.name }}</div>
          <div>
            {{ formatDate(alternateShowSuggestion.date) }} at {{ formatTime(alternateShowSuggestion.start_time) }}
          </div>
          <div class="mt-2">
            <Button
              label="View These Seats"
              icon="pi pi-external-link"
              class="p-button-sm"
              @click="switchToAlternateShow"
            />
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
  </div>
</template>

<script setup>
import { useWindowSize } from '@vueuse/core'; 
const route = useRoute();
const showId = ref(route.params.id);
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

// Window size for responsive behavior
const { width } = useWindowSize();
const isMobile = computed(() => width.value < 768);

// Fetch show and seat data on mount
onMounted(async () => {
  await fetchShowDetails();
  await fetchAvailableSeats();
  await checkOtherShows();
  loading.value = false;

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
  const sectionNames = [...new Set(availableSeats.value.map(seat => seat.section))];
  
  // You'll need logic to map your actual section names to these positions
  // This is an example - adjust based on your actual section naming
  sectionNames.forEach(sectionName => {
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
    const sectionSeats = availableSeats.value.filter(seat => seat.section === sectionName);
    
    // Group by row
    const rows = {};
    sectionSeats.forEach(seat => {
      if (!rows[seat.row_name]) {
        rows[seat.row_name] = { name: seat.row_name, seats: [] };
      }
      rows[seat.row_name].seats.push(seat);
    });
    
    // Sort seats within rows
    Object.values(rows).forEach(row => {
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

// Updated filter logic
const filteredSeats = computed(() => {
  let seats = [...availableSeats.value];
  
  if (selectedSectionFilter.value && selectedSectionFilter.value.name !== 'All Sections') {
    seats = seats.filter(seat => seat.section === selectedSectionFilter.value.name);
  }
  
  if (activeSection.value && sectionsByType.value[activeSection.value]) {
    const sectionName = sectionsByType.value[activeSection.value].name;
    seats = seats.filter(seat => seat.section === sectionName);
  }
  
  if (showHandicapOnly.value) {
    seats = seats.filter(seat => seat.handicap_access);
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

  try {
    // Find best seats for current show
    const { data: currentData, error: currentError } = await useFetch(
      `/api/recital-shows/${showId.value}/seats/suggested`,
      {
        params: {
          count: ticketCount.value,
          keep_together: true,
          handicap_access: showHandicapOnly.value
        }
      }
    );

    if (currentError.value) throw new Error(currentError.value.message);

    // Check if we found enough seats
    if (currentData.value.success) {
      bestSeats.value = currentData.value.seats;

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

    // Select seat
    selectedSeats.value.push(seat);
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

function acceptBestSeats() {
  // Set the selected seats to the best seats and proceed to checkout
  selectedSeats.value = [...bestSeats.value];
  showBestSeatsResult.value = false;
  proceedToCheckout();
}

function cancelBestSeats() {
  // Clear the best seats and go back to the initial view
  bestSeats.value = [];
  showBestSeatsResult.value = false;

  // Switch to manual selection if they reject the automatic selection
  seatPreference.value = 'select';
  showSeatMap.value = true;
}

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

    const { data, error } = await useFetch(`/api/recital-shows/${showId.value}/seats/reserve`, {
      method: 'POST',
      body: {
        seat_ids: seatIds,
        email: '', // Will be collected during checkout
        phone: '' // Will be collected during checkout
      }
    });

    if (error.value) throw new Error(error.value.message);

    // Store the reservation token for recovery if needed
    localStorage.setItem('current_reservation_token', data.value.reservation.token);

    // Navigate to checkout with reservation token
    navigateTo(`/public/checkout/${data.value.reservation.token}`);
  } catch (error) {
    console.error('Error creating reservation:', error);
    useToast().add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to reserve seats. Please try again.',
      life: 3000
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
</style>
