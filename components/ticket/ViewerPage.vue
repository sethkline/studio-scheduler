<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header with refresh button -->
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold">Your Tickets</h1>
        <p class="text-gray-600 mt-1">View and manage your tickets</p>
      </div>
      <Button 
        v-if="hasQueryParams"
        icon="pi pi-refresh" 
        @click="refreshTickets" 
        :loading="loading"
        aria-label="Refresh"
        class="p-button-rounded"
      />
    </div>

    <!-- Ticket Search Form (only shown if no query params) -->
    <div v-if="!hasQueryParams" class="card p-6 max-w-md mx-auto mb-8">
      <h2 class="text-xl font-semibold mb-4">Find Your Tickets</h2>
      
      <div class="mb-4">
        <label for="email" class="block text-sm font-medium mb-1">Email Address</label>
        <InputText id="email" v-model="searchForm.email" placeholder="Enter your email" class="w-full" />
      </div>
      
      <div class="mb-4">
        <label for="phone" class="block text-sm font-medium mb-1">Phone Number (optional)</label>
        <InputText id="phone" v-model="searchForm.phone" placeholder="Enter your phone number" class="w-full" />
      </div>
      
      <div v-if="searchError" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4">
        <div class="flex items-center">
          <i class="pi pi-exclamation-circle text-red-500 mr-2"></i>
          <div>{{ searchError }}</div>
        </div>
      </div>
      
      <div class="flex justify-end">
        <Button 
          label="Find Tickets" 
          icon="pi pi-search" 
          @click="searchTickets" 
          :loading="searching"
        />
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl"></i>
      <p class="mt-2">Loading your tickets...</p>
    </div>

    <!-- Empty state with refresh button -->
    <div v-else-if="hasQueryParams && (!ticketData && !orders && !error)" class="card p-6 text-center">
      <i class="pi pi-ticket text-5xl text-gray-400 mb-4"></i>
      <h2 class="text-2xl font-bold mb-2">No Tickets Found</h2>
      <p class="mb-4">We couldn't find any tickets to display. Try refreshing the page.</p>
      <Button label="Refresh" icon="pi pi-refresh" @click="refreshTickets" />
    </div>

    <!-- Error state -->
    <div v-else-if="error && !hasQueryParams" class="card p-6 text-center">
      <i class="pi pi-exclamation-triangle text-5xl text-yellow-500 mb-4"></i>
      <h2 class="text-2xl font-bold mb-2">Tickets Not Found</h2>
      <p class="mb-4">{{ error }}</p>
      <Button label="Try Again" icon="pi pi-replay" @click="resetSearch" class="mr-2" />
      <NuxtLink to="/public/recitals">
        <Button label="Browse Shows" icon="pi pi-search" class="p-button-secondary" />
      </NuxtLink>
    </div>

    <!-- Error state with refresh for query params -->
    <div v-else-if="error && hasQueryParams" class="card p-6 text-center">
      <i class="pi pi-exclamation-triangle text-5xl text-yellow-500 mb-4"></i>
      <h2 class="text-2xl font-bold mb-2">Error Loading Tickets</h2>
      <p class="mb-4">{{ error }}</p>
      <Button label="Refresh" icon="pi pi-refresh" @click="refreshTickets" class="mr-2" />
      <NuxtLink to="/public/tickets">
        <Button label="Search Tickets" icon="pi pi-search" class="p-button-secondary" />
      </NuxtLink>
    </div>

    <!-- Order selection if we found multiple -->
    <div v-else-if="orders && orders.length > 0 && !selectedOrder" class="card p-6">
      <h2 class="text-xl font-semibold mb-4">Your Orders</h2>
      <p class="mb-4">We found {{ orders.length }} orders associated with your information. Select an order to view tickets:</p>
      
      <div class="space-y-4">
        <div v-for="order in orders" :key="order.id" 
            class="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            @click="selectOrder(order.id)">
          <div class="flex justify-between items-center">
            <div>
              <p class="font-semibold">Order #{{ order.id.substring(0, 8).toUpperCase() }}</p>
              <p class="text-gray-600">{{ order.show_name }} - {{ formatDate(order.show_date) }}</p>
              <p class="text-sm text-gray-500">{{ order.tickets_count }} tickets</p>
            </div>
            <Button icon="pi pi-chevron-right" class="p-button-rounded p-button-text" />
          </div>
        </div>
      </div>
    </div>

    <!-- Ticket display -->
    <div v-else-if="ticketData" class="grid grid-cols-1 gap-6">
      <!-- Order information -->
      <div class="card p-6">
        <div class="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
          <div>
            <h2 class="text-2xl font-bold">Order #{{ ticketData.order.id.substring(0, 8).toUpperCase() }}</h2>
            <p class="text-gray-600">{{ formatDate(ticketData.show.date) }}</p>
          </div>
          <div class="mt-4 md:mt-0">
            <Button 
              label="Print Tickets" 
              icon="pi pi-print" 
              @click="printTickets" 
              class="mr-2"
            />
            <Button 
              label="Email Tickets" 
              icon="pi pi-envelope" 
              severity="secondary" 
              @click="showEmailDialog = true"
            />
          </div>
        </div>

        <div class="bg-gray-50 p-4 rounded-lg mb-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 class="font-semibold">Show</h3>
              <p>{{ ticketData.show.name }}</p>
            </div>
            <div>
              <h3 class="font-semibold">Location</h3>
              <p>{{ ticketData.show.location }}</p>
            </div>
            <div>
              <h3 class="font-semibold">Time</h3>
              <p>{{ formatTime(ticketData.show.start_time) }}</p>
            </div>
          </div>
        </div>

        <h3 class="text-xl font-semibold mb-4">Your Tickets</h3>

        <div class="space-y-4">
          <div v-for="ticket in ticketData.tickets" :key="ticket.id" class="border rounded-lg overflow-hidden">
            <div class="ticket-container grid grid-cols-1 md:grid-cols-4">
              <!-- Ticket info section -->
              <div class="p-4 col-span-3 flex flex-col">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <h4 class="font-bold text-lg">{{ ticketData.show.name }}</h4>
                    <p class="text-gray-600">{{ formatDate(ticketData.show.date) }} at {{ formatTime(ticketData.show.start_time) }}</p>
                  </div>
                  <div v-if="!ticket.is_valid" class="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                    Used
                  </div>
                </div>
                
                <!-- Show image -->
                <div class="mb-3">
                  <img 
                    :src="getShowImage(ticketData.show.name, ticketData.show.id)" 
                    :alt="ticketData.show.name"
                    class="w-full h-32 object-cover rounded"
                  />
                </div>
                
                <div class="flex-grow">
                  <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p class="text-sm text-gray-500">SECTION</p>
                      <p class="font-semibold">{{ ticket.seat.section }}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-500">ROW</p>
                      <p class="font-semibold">{{ ticket.seat.row_name }}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-500">SEAT</p>
                      <p class="font-semibold">{{ ticket.seat.seat_number }}</p>
                    </div>
                    <div v-if="ticket.seat.handicap_access">
                      <p class="text-sm text-gray-500">TYPE</p>
                      <p class="font-semibold text-blue-600">Accessible Seat</p>
                    </div>
                  </div>
                  
                  <div class="text-sm text-gray-600">
                    <p>{{ ticketData.show.location }}</p>
                  </div>
                </div>
                
                <div class="mt-3 pt-3 border-t border-gray-200">
                  <p class="text-sm text-gray-500">PURCHASED BY</p>
                  <p class="font-semibold">{{ ticketData.order.customer_name }}</p>
                </div>
              </div>
              
              <!-- QR code section -->
              <div class="bg-gray-100 p-4 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-gray-200">
                <div v-if="ticket.is_valid" class="mb-2">
                  <canvas :id="'qrcode-' + ticket.id" width="120" height="120"></canvas>
                </div>
                <p v-if="ticket.is_valid" class="text-xs text-center break-all">{{ ticket.ticket_code }}</p>
                <div v-else class="text-center">
                  <i class="pi pi-check-circle text-3xl text-gray-400 mb-2"></i>
                  <p class="text-sm text-gray-500">Ticket Used</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Back button to search for more tickets -->
        <div v-if="!hasQueryParams" class="mt-6 text-center">
          <Button 
            label="Find More Tickets" 
            icon="pi pi-search" 
            @click="resetSearch"
            severity="secondary"
          />
        </div>
      </div>
    </div>

    <!-- Email dialog -->
    <Dialog v-model:visible="showEmailDialog" header="Email Tickets" :modal="true" class="w-full max-w-lg">
      <div class="p-4">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Email</label>
          <InputText v-model="emailAddress" placeholder="Enter email address" class="w-full" />
        </div>
        
        <div v-if="emailError" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4">
          <div class="flex items-center">
            <i class="pi pi-exclamation-circle text-red-500 mr-2"></i>
            <div>{{ emailError }}</div>
          </div>
        </div>
        
        <div v-if="emailSuccess" class="bg-green-50 border border-green-200 text-green-700 p-4 rounded mb-4">
          <div class="flex items-center">
            <i class="pi pi-check-circle text-green-500 mr-2"></i>
            <div>{{ emailSuccess }}</div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <Button label="Cancel" @click="showEmailDialog = false" class="p-button-text" />
        <Button 
          label="Send" 
          icon="pi pi-envelope" 
          @click="sendTicketsEmail" 
          :loading="sendingEmail" 
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import QRCode from 'qrcode';

const route = useRoute();
const router = useRouter();
const toast = useToast();

// Search form state
const searchForm = ref({
  email: '',
  phone: ''
});
const searching = ref(false);
const searchError = ref('');

// Ticket loading state
const loading = ref(true);
const error = ref('');
const ticketData = ref(null);
const orders = ref(null);
const selectedOrder = ref(null);

// Email dialog state
const showEmailDialog = ref(false);
const emailAddress = ref('');
const emailError = ref('');
const emailSuccess = ref('');
const sendingEmail = ref(false);

// Check if we have query parameters
const hasQueryParams = computed(() => {
  return !!route.query.orderId || !!route.query.email;
});

// Get order ID and email from the URL
const orderId = computed(() => route.query.orderId as string);
const email = computed(() => route.query.email as string);

onMounted(async () => {
  // If we have query parameters, load the tickets directly
  if (hasQueryParams.value) {
    await refreshTickets();
  } else {
    // No query params, just show the search form
    loading.value = false;
  }
});

// Watch for ticket data changes to generate QR codes
watch(ticketData, () => {
  if (ticketData.value && ticketData.value.tickets) {
    nextTick(() => {
      generateQRCodes();
    });
  }
}, { deep: true });

// Load tickets for a specific order
async function loadTickets(orderIdToLoad, emailToVerify) {
  loading.value = true;
  error.value = '';
  
  try {
    // Set the initial email address to the one from the URL
    if (emailToVerify) {
      emailAddress.value = emailToVerify;
    }
    
    // Fetch the ticket data
    const { data, error: fetchError } = await useFetch(`/api/tickets`, {
      params: {
        orderId: orderIdToLoad,
        email: emailToVerify
      }
    });

    if (fetchError.value) {
      error.value = fetchError.value.message || 'Failed to load tickets';
      loading.value = false;
      return;
    }

    if (!data.value) {
      error.value = 'No tickets found for this order and email';
      loading.value = false;
      return;
    }

    ticketData.value = data.value;
    selectedOrder.value = orderIdToLoad;
    loading.value = false;
  } catch (err) {
    console.error('Error loading tickets:', err);
    error.value = 'An error occurred while loading your tickets';
    loading.value = false;
  }
}

// Refresh tickets
async function refreshTickets() {
  // Reset data
  ticketData.value = null;
  orders.value = null;
  selectedOrder.value = null;
  error.value = '';
  
  // If we have an order ID, load it directly
  if (orderId.value) {
    await loadTickets(orderId.value, email.value);
  } 
  // If we have just an email, search by email
  else if (email.value) {
    await searchByEmail(email.value);
  }
}

// Search for tickets by email/phone
async function searchTickets() {
  if (!searchForm.value.email && !searchForm.value.phone) {
    searchError.value = 'Please enter an email address or phone number';
    return;
  }
  
  searching.value = true;
  searchError.value = '';
  
  try {
    // Call the API to search for tickets
    const { data, error: apiError } = await useFetch('/api/tickets/search', {
      method: 'POST',
      body: {
        email: searchForm.value.email,
        phone: searchForm.value.phone
      }
    });
    
    if (apiError.value) {
      throw new Error(apiError.value.message || 'Failed to search for tickets');
    }
    
    if (!data.value || !data.value.orders || data.value.orders.length === 0) {
      throw new Error('No tickets found for this email or phone number');
    }
    
    // If we found multiple orders, show selection
    if (data.value.orders.length > 1) {
      orders.value = data.value.orders;
      selectedOrder.value = null;
    } else {
      // If just one order, load it directly
      await loadTickets(data.value.orders[0].id, searchForm.value.email);
    }
  } catch (err) {
    console.error('Error searching for tickets:', err);
    searchError.value = err.message || 'No tickets found';
  } finally {
    searching.value = false;
  }
}

// Search by email only (used when email is in query params)
async function searchByEmail(emailToSearch) {
  loading.value = true;
  error.value = '';
  
  try {
    // Call the API to search for tickets by email
    const { data, error: apiError } = await useFetch('/api/tickets/search', {
      method: 'POST',
      body: {
        email: emailToSearch
      }
    });
    
    if (apiError.value) {
      throw new Error(apiError.value.message || 'Failed to search for tickets');
    }
    
    if (!data.value || !data.value.orders || data.value.orders.length === 0) {
      throw new Error('No tickets found for this email address');
    }
    
    // If we found multiple orders, show selection
    if (data.value.orders.length > 1) {
      orders.value = data.value.orders;
      selectedOrder.value = null;
      loading.value = false;
    } else {
      // If just one order, load it directly
      await loadTickets(data.value.orders[0].id, emailToSearch);
    }
  } catch (err) {
    console.error('Error searching for tickets by email:', err);
    error.value = err.message || 'No tickets found';
    loading.value = false;
  }
}

// Select a specific order from the list
async function selectOrder(id) {
  selectedOrder.value = id;
  await loadTickets(id, searchForm.value.email || email.value);
}

// Reset the search form
function resetSearch() {
  searchForm.value.email = '';
  searchForm.value.phone = '';
  ticketData.value = null;
  orders.value = null;
  selectedOrder.value = null;
  error.value = '';
  searchError.value = '';
}

// Generate QR codes for each ticket
function generateQRCodes() {
  if (!ticketData.value || !ticketData.value.tickets) return;
  
  ticketData.value.tickets.forEach(ticket => {
    if (ticket.is_valid) {
      const canvasId = 'qrcode-' + ticket.id;
      const canvas = document.getElementById(canvasId);
      
      if (canvas) {
        // Generate the verification URL
        const verificationUrl = `${window.location.origin}/verify-ticket?code=${ticket.ticket_code}`;
        
        // Generate QR code
        QRCode.toCanvas(canvas, verificationUrl, {
          width: 120,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        }, function (error) {
          if (error) console.error('Error generating QR code:', error);
        });
      }
    }
  });
}

// Get an image for the show
function getShowImage(showName, showId) {
  // You can implement logic to get a specific image for each show
  // For now, we'll use a generated image based on the show ID
  return `/api/show-images/${showId}?name=${encodeURIComponent(showName)}` || 
         `/api/placeholder/600/300?text=${encodeURIComponent(showName)}`;
}

function printTickets() {
  window.print();
}

async function sendTicketsEmail() {
  // Basic email validation
  if (!emailAddress.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress.value)) {
    emailError.value = 'Please enter a valid email address';
    return;
  }

  emailError.value = '';
  emailSuccess.value = '';
  sendingEmail.value = true;

  try {
    const { data, error: emailError } = await useFetch('/api/tickets/email', {
      method: 'POST',
      body: {
        orderId: selectedOrder.value || orderId.value,
        email: email.value || searchForm.value.email, // Original verification email
        sendToEmail: emailAddress.value // Where to send the tickets
      }
    });

    if (emailError.value) {
      throw new Error(emailError.value.message || 'Failed to send email');
    }

    emailSuccess.value = 'Tickets have been sent to your email address';
    
    // Close dialog after a delay
    setTimeout(() => {
      showEmailDialog.value = false;
      emailSuccess.value = '';
      
      toast.add({
        severity: 'success',
        summary: 'Email Sent',
        detail: `Tickets have been sent to ${emailAddress.value}`,
        life: 3000
      });
    }, 2000);
  } catch (err) {
    console.error('Error sending email:', err);
    emailError.value = err.message || 'Failed to send email';
  } finally {
    sendingEmail.value = false;
  }
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
/* Print styles */
@media print {
  .pi-print, .pi-envelope, button {
    display: none !important;
  }
  
  .ticket-container {
    page-break-inside: avoid;
    margin-bottom: 20px;
    border: 1px solid #ddd;
  }
}

.ticket-container {
  break-inside: avoid;
}
</style>