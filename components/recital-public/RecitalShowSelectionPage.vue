<!-- pages/public/recitals/index.vue -->
<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">Upcoming Recital Shows</h1>
    
    <!-- Pre-sale Access Banner (shown conditionally) -->
    <div v-if="hasPreSaleShows && !hasPreSaleAccess" class="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
      <h2 class="font-bold text-lg mb-2 text-yellow-800">Pre-Sale Access Available</h2>
      <p class="mb-3 text-yellow-700">Some upcoming shows have pre-sale ticket availability. Enter your pre-sale code to access these tickets before public sales begin.</p>
      <div class="flex flex-col sm:flex-row sm:items-center gap-2">
        <InputText v-model="preSaleCode" placeholder="Enter pre-sale code" class="flex-grow" />
        <Button label="Submit" @click="validatePreSaleCode" :loading="validatingPreSaleCode" />
      </div>
      <p v-if="preSaleError" class="mt-2 text-sm text-red-600">{{ preSaleError }}</p>
    </div>
    
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl"></i>
      <p class="mt-2">Loading upcoming shows...</p>
    </div>
    
    <!-- No Results State -->
    <div v-else-if="shows.length === 0" class="text-center py-12 bg-gray-50 rounded-lg">
      <i class="pi pi-calendar-times text-4xl text-gray-400"></i>
      <h2 class="text-xl font-semibold mt-2">No Shows Available</h2>
      <p class="mt-2 text-gray-600">Check back later for upcoming recital shows.</p>
      <Button label="Refetch shows" icon="pi pi-plus" class="mt-4" @click="fetchShows" />
    </div>
    
    <!-- Show List -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="show in shows" :key="show.id" class="card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <!-- Show Image -->
        <img :src="show.image_url || '/placeholder-recital.jpg'" alt="Recital Show" class="w-full h-48 object-cover">
        
        <!-- Show Content -->
        <div class="p-4">
          <div class="flex justify-between items-start">
            <h2 class="text-xl font-bold text-primary-800">{{ show.name }}</h2>
            <span v-if="isPreSaleOnly(show)" class="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
              Pre-Sale
            </span>
          </div>
          
          <p v-if="show.series?.name" class="text-sm text-gray-600 italic mt-1">
            {{ show.series.name }} - {{ show.series.theme || '' }}
          </p>
          
          <div class="flex items-center mt-2 text-sm text-gray-600">
            <i class="pi pi-calendar mr-2"></i>
            <span>{{ formatDate(show.date) }}</span>
          </div>
          
          <div class="flex items-center mt-1 text-sm text-gray-600">
            <i class="pi pi-clock mr-2"></i>
            <span>{{ formatTime(show.start_time) }}</span>
          </div>
          
          <div class="flex items-center mt-1 text-sm text-gray-600">
            <i class="pi pi-map-marker mr-2"></i>
            <span>{{ show.location }}</span>
          </div>
          
          <!-- Ticket Status Indicator -->
          <div class="mt-3">
            <span v-if="show.can_sell_tickets" 
                  class="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
              Tickets Available
            </span>
            <span v-else-if="isPreSaleOnly(show) && !hasPreSaleAccess" 
                  class="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
              Pre-Sale Only
            </span>
            <span v-else-if="show.ticket_sale_start && new Date(show.ticket_sale_start) > new Date()" 
                  class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
              On Sale {{ formatDate(show.ticket_sale_start) }}
            </span>
            <span v-else class="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
              Not Available Yet
            </span>
          </div>
          
          <!-- Show Details Button -->
          <div class="mt-4 flex justify-between items-center">
            <NuxtLink :to="`/public/recitals/${show.id}`">
              <Button label="View Details" class="p-button-outlined" />
            </NuxtLink>
            
            <Button v-if="canPurchaseTickets(show)" 
                    label="Buy Tickets" 
                    icon="pi pi-ticket" 
                    @click="navigateToSeating(show.id)" />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Simple Pagination -->
    <div v-if="shows.length > 0 && pagination.totalPages > 1" class="mt-8 flex justify-center gap-2">
      <Button icon="pi pi-chevron-left" 
              class="p-button-outlined" 
              :disabled="pagination.page === 1"
              @click="changePage(pagination.page - 1)" />
      
      <span class="flex items-center px-4">
        Page {{ pagination.page }} of {{ pagination.totalPages }}
      </span>
      
      <Button icon="pi pi-chevron-right" 
              class="p-button-outlined" 
              :disabled="pagination.page >= pagination.totalPages"
              @click="changePage(pagination.page + 1)" />
    </div>
  </div>
</template>

<script setup>
const shows = ref([])
const loading = ref(true)
const pagination = ref({
  page: 1,
  limit: 9, // Increased to show more per page
  totalItems: 0,
  totalPages: 0
})
const preSaleCode = ref('')
const validatingPreSaleCode = ref(false)
const preSaleError = ref('')
const hasPreSaleAccess = ref(false)

// Check for stored pre-sale code on mount
onMounted(() => {
  const storedPreSaleCode = localStorage.getItem('preSaleCode')
  if (storedPreSaleCode) {
    preSaleCode.value = storedPreSaleCode
    hasPreSaleAccess.value = true
  }
  
  fetchShows()
})

// Computed property to check if there are any pre-sale shows
const hasPreSaleShows = computed(() => {
  return shows.value.some(show => isPreSaleOnly(show))
})

// Fetch shows from API
async function fetchShows() {
  loading.value = true
  
  try {
    // Prepare query parameters - keeping it simple with just pagination
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }
    
    // Include pre-sale code if available
    if (hasPreSaleAccess.value && preSaleCode.value) {
      params.pre_sale_code = preSaleCode.value
    }
    
    // Call API
    const { data, error } = await useFetch('/api/recital-shows', { params })
    
    if (error.value) throw new Error(error.value.message)
    
    shows.value = data.value.shows
    pagination.value = data.value.pagination
  } catch (error) {
    console.error('Error fetching shows:', error)
    // Display error message
    useToast().add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load recital shows',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// Simple page change function
function changePage(newPage) {
  if (newPage < 1 || newPage > pagination.value.totalPages) return
  pagination.value.page = newPage
  fetchShows()
}

// Navigate to seating selection
function navigateToSeating(showId) {
  navigateTo(`/public/recitals/${showId}/seating`)
}

// Validate pre-sale code
async function validatePreSaleCode() {
  if (!preSaleCode.value) {
    preSaleError.value = 'Please enter a pre-sale code'
    return
  }
  
  validatingPreSaleCode.value = true
  preSaleError.value = ''
  
  try {
    const { data, error } = await useFetch('/api/recital-shows/pre-sale/validate', {
      method: 'POST',
      body: {
        code: preSaleCode.value
      }
    })
    
    if (error.value) throw new Error(error.value.message)
    
    if (data.value.valid) {
      // Store the valid pre-sale code for future requests
      localStorage.setItem('preSaleCode', preSaleCode.value)
      hasPreSaleAccess.value = true
      
      useToast().add({
        severity: 'success',
        summary: 'Success',
        detail: 'Pre-sale access granted!',
        life: 3000
      })
      
      // Refresh shows to include pre-sale options
      fetchShows()
    } else {
      preSaleError.value = 'Invalid pre-sale code'
    }
  } catch (error) {
    console.error('Error validating pre-sale code:', error)
    preSaleError.value = error.message || 'Error validating code'
  } finally {
    validatingPreSaleCode.value = false
  }
}

// Check if a show is only available via pre-sale
function isPreSaleOnly(show) {
  return show.is_pre_sale_active && 
         !show.can_sell_tickets && 
         new Date() >= new Date(show.pre_sale_start) && 
         new Date() <= new Date(show.pre_sale_end)
}

// Check if tickets can be purchased for a show
function canPurchaseTickets(show) {
  // Regular ticket sales
  if (show.can_sell_tickets) return true
  
  // Pre-sale access
  if (hasPreSaleAccess.value && isPreSaleOnly(show)) return true
  
  return false
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

// Format time for display
function formatTime(timeString) {
  if (!timeString) return ''
  const [hours, minutes] = timeString.split(':')
  const date = new Date()
  date.setHours(parseInt(hours))
  date.setMinutes(parseInt(minutes))
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  })
}
</script>