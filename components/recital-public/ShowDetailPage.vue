<!-- pages/public/recitals/[id]/index.vue -->
<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Back Button -->
    <div class="mb-6">
      <NuxtLink to="/public/recitals" class="text-primary-600 inline-flex items-center">
        <i class="pi pi-arrow-left mr-2"></i> Back to Shows
      </NuxtLink>
    </div>
    
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl"></i>
      <p class="mt-2">Loading show details...</p>
    </div>
    
    <!-- Show Not Found -->
    <div v-else-if="!show.id" class="text-center py-12 bg-gray-50 rounded-lg">
      <i class="pi pi-exclamation-triangle text-4xl text-yellow-500"></i>
      <h2 class="text-2xl font-bold mt-4">Show Not Found</h2>
      <p class="mt-2 text-gray-600">The recital show you're looking for could not be found.</p>
      <NuxtLink to="/public/recitals" class="mt-4 inline-block">
        <Button label="Browse All Shows" icon="pi pi-search" />
      </NuxtLink>
    </div>
    
    <!-- Show Details Content -->
    <div v-else>
      <!-- Main Show Info Card -->
      <div class="card mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Show Image -->
          <div class="md:col-span-1">
            <img :src="show.image_url || '/placeholder-recital.jpg'" 
                 alt="Recital Show" 
                 class="w-full h-64 object-cover rounded-lg shadow">
          </div>
          
          <!-- Show Details -->
          <div class="md:col-span-2">
            <div class="flex justify-between items-start">
              <h1 class="text-3xl font-bold">{{ show.name }}</h1>
              <span v-if="isPreSaleOnly" 
                    class="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                Pre-Sale
              </span>
            </div>
            
            <p v-if="show.series?.name" class="text-lg text-gray-700 mt-1">
              {{ show.series.name }} <span v-if="show.series.theme">- {{ show.series.theme }}</span>
            </p>
            
            <div class="mt-4 space-y-2">
              <div class="flex items-center">
                <i class="pi pi-calendar text-primary-500 mr-3 text-xl"></i>
                <div>
                  <div class="font-medium">Date</div>
                  <div>{{ formatDate(show.date) }}</div>
                </div>
              </div>
              
              <div class="flex items-center">
                <i class="pi pi-clock text-primary-500 mr-3 text-xl"></i>
                <div>
                  <div class="font-medium">Time</div>
                  <div>{{ formatTime(show.start_time) }} to {{ formatTime(show.end_time) }}</div>
                </div>
              </div>
              
              <div class="flex items-center">
                <i class="pi pi-map-marker text-primary-500 mr-3 text-xl"></i>
                <div>
                  <div class="font-medium">Location</div>
                  <div>{{ show.location }}</div>
                </div>
              </div>
              
              <div class="flex items-center">
                <i class="pi pi-ticket text-primary-500 mr-3 text-xl"></i>
                <div>
                  <div class="font-medium">Ticket Price</div>
                  <div>${{ formatPrice(show.ticket_price_in_cents) }}</div>
                </div>
              </div>
            </div>
            
            <div class="mt-6" v-if="show.description">
              <h3 class="font-medium mb-2">About this Show</h3>
              <p class="text-gray-700">{{ show.description }}</p>
            </div>
            
            <!-- Ticket Availability Section -->
            <div class="mt-6 p-4 rounded-lg" :class="getTicketSectionClass">
              <div class="flex items-start">
                <i class="pi text-2xl mr-3 mt-1" :class="getTicketIconClass"></i>
                <div>
                  <h3 class="font-bold text-lg">{{ getTicketStatusTitle }}</h3>
                  <p>{{ getTicketStatusMessage }}</p>
                  
                  <div v-if="showPreSaleAccess" class="mt-3">
                    <div class="flex flex-col sm:flex-row items-start gap-2">
                      <InputText v-model="preSaleCode" placeholder="Enter pre-sale code" class="flex-grow" />
                      <Button label="Submit" @click="validatePreSaleCode" :loading="validatingPreSaleCode" />
                    </div>
                    <p v-if="preSaleError" class="mt-2 text-sm text-red-600">{{ preSaleError }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="mb-6 flex flex-wrap gap-3 justify-center md:justify-end">
        <Button v-if="canPurchaseTickets" 
                label="Buy Tickets" 
                icon="pi pi-ticket" 
                size="large"
                @click="navigateToSeating" />
                
        <Button v-if="show.program?.id"
                label="View Program" 
                icon="pi pi-book" 
                class="p-button-outlined" 
                @click="showProgramDialog = true" />
      </div>
      
      <!-- Performances Section -->
      <div class="card mb-6">
        <h2 class="text-xl font-bold mb-4">Performances</h2>
        
        <div v-if="performances.length === 0" class="text-center py-6 text-gray-500">
          No performances have been added to this show yet.
        </div>
        
        <div v-else>
          <ul class="divide-y">
            <li v-for="(performance, index) in performances" :key="performance.id" class="py-4">
              <div class="flex items-start">
                <div class="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-primary-100 text-primary-700 rounded-full font-medium">
                  {{ index + 1 }}
                </div>
                <div class="ml-4">
                  <h3 class="font-bold">{{ performance.song_title }}</h3>
                  <p class="text-gray-700">
                    {{ performance.song_artist }}
                    <span v-if="performance.choreographer"> • Choreographed by {{ performance.choreographer }}</span>
                  </p>
                  <div class="mt-1 flex items-center">
                    <span class="inline-block px-2 py-1 rounded-full text-xs font-medium" 
                          :style="{ backgroundColor: getDanceStyleColor(performance) + '33', color: getDanceStyleColor(performance) }">
                      {{ getDanceStyleName(performance) }}
                    </span>
                    <span class="mx-2 text-gray-400">•</span>
                    <span class="text-sm text-gray-600">{{ performance.class_instance?.name }}</span>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
      
      <!-- Media & Resources -->
      <div class="card">
        <h2 class="text-xl font-bold mb-4">Media & Resources</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Videos Section -->
          <div class="border rounded-lg p-4">
            <div class="flex items-center mb-4">
              <i class="pi pi-video mr-2 text-lg"></i>
              <h3 class="font-bold">Recital Videos</h3>
            </div>
            
            <div v-if="videos.length === 0" class="text-center py-4 text-gray-500">
              Videos will be available after the performance.
            </div>
            
            <ul v-else class="space-y-3">
              <li v-for="video in videos" :key="video.id" class="flex justify-between items-center">
                <div>
                  <span class="font-medium">{{ video.title }}</span>
                  <div class="text-sm text-gray-600">Format: {{ formatVideoType(video.format) }}</div>
                </div>
                <Button :label="video.format === 'digital' ? 'Access' : 'Order'" 
                        :icon="video.format === 'digital' ? 'pi pi-play' : 'pi pi-shopping-cart'"
                        class="p-button-sm"
                        @click="handleVideoAction(video)" />
              </li>
            </ul>
          </div>
          
          <!-- Program Preview Section -->
          <div class="border rounded-lg p-4">
            <div class="flex items-center mb-4">
              <i class="pi pi-book mr-2 text-lg"></i>
              <h3 class="font-bold">Program Preview</h3>
            </div>
            
            <div v-if="!show.program?.id" class="text-center py-4 text-gray-500">
              Program information is not available yet.
            </div>
            
            <div v-else class="text-center">
              <img v-if="show.program?.cover_image_url" 
                   :src="show.program.cover_image_url" 
                   alt="Program Cover" 
                   class="max-w-full h-32 object-contain mx-auto mb-3">
              
              <Button label="View Program" 
                     icon="pi pi-book" 
                     @click="showProgramDialog = true" />
              
              <div class="mt-3">
                <Button label="Download PDF" 
                       icon="pi pi-download" 
                       class="p-button-outlined p-button-sm"
                       @click="downloadProgramPDF" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Program Dialog -->
    <Dialog v-model:visible="showProgramDialog" 
            :header="`${show.name} Program`" 
            :modal="true" 
            :dismissableMask="true"
            class="w-full max-w-4xl">
      <div class="p-fluid">
        <!-- Program Cover -->
        <div v-if="show.program?.cover_image_url" class="mb-6 text-center">
          <img :src="show.program.cover_image_url" 
               alt="Program Cover" 
               class="max-w-full max-h-80 object-contain mx-auto">
        </div>
        
        <!-- Director's Note -->
        <div v-if="show.program?.artistic_director_note" class="mb-6">
          <h3 class="text-xl font-bold mb-3">Artistic Director's Note</h3>
          <div class="prose prose-sm max-w-none" v-html="show.program.artistic_director_note"></div>
        </div>
        
        <!-- Performances -->
        <div class="mb-6">
          <h3 class="text-xl font-bold mb-3">Performances</h3>
          <ul class="divide-y">
            <li v-for="(performance, index) in performances" :key="performance.id" class="py-3">
              <div class="flex">
                <div class="mr-4 font-bold">{{ index + 1 }}.</div>
                <div>
                  <h4 class="font-bold">{{ performance.song_title }}</h4>
                  <p>{{ performance.song_artist }}</p>
                  <p class="text-sm text-gray-600">
                    {{ performance.class_instance?.name }}
                    <span v-if="performance.choreographer"> • Choreographed by {{ performance.choreographer }}</span>
                  </p>
                </div>
              </div>
            </li>
          </ul>
        </div>
        
        <!-- Acknowledgments -->
        <div v-if="show.program?.acknowledgments" class="mb-6">
          <h3 class="text-xl font-bold mb-3">Acknowledgments</h3>
          <div class="prose prose-sm max-w-none" v-html="show.program.acknowledgments"></div>
        </div>
      </div>
      
      <template #footer>
        <Button label="Close" icon="pi pi-times" @click="showProgramDialog = false" class="p-button-text" />
        <Button label="Download PDF" icon="pi pi-download" @click="downloadProgramPDF" />
      </template>
    </Dialog>
    
    <!-- Video Access Dialog -->
    <Dialog v-model:visible="showVideoDialog" 
            header="Video Access" 
            :modal="true" 
            class="w-full max-w-md">
      <div class="p-fluid">
        <div v-if="selectedVideo?.format === 'digital'">
          <p class="mb-4">Please enter your access code to view this video recording.</p>
          
          <div class="field mb-4">
            <label for="access-code" class="font-medium">Video Access Code</label>
            <InputText id="access-code" v-model="videoAccessCode" placeholder="Enter your access code" />
            <small v-if="videoAccessError" class="p-error">{{ videoAccessError }}</small>
          </div>
        </div>
        
        <div v-else>
          <p class="mb-4">Order a physical copy of this recital recording.</p>
          <Button label="Continue to Order Form" 
                 icon="pi pi-arrow-right" 
                 @click="navigateToMediaOrder" />
        </div>
      </div>
      
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="showVideoDialog = false" />
        <Button v-if="selectedVideo?.format === 'digital'" 
                label="Access Video" 
                icon="pi pi-check" 
                @click="validateVideoAccess" 
                :loading="validatingVideoAccess" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
const route = useRoute()
const showId = route.params.id
const show = ref({})
const performances = ref([])
const videos = ref([])
const loading = ref(true)
const showProgramDialog = ref(false)
const showVideoDialog = ref(false)
const selectedVideo = ref(null)
const videoAccessCode = ref('')
const videoAccessError = ref('')
const validatingVideoAccess = ref(false)
const preSaleCode = ref('')
const preSaleError = ref('')
const validatingPreSaleCode = ref(false)
const hasPreSaleAccess = ref(false)

// Check for stored pre-sale code on mount
onMounted(() => {
  const storedPreSaleCode = localStorage.getItem('preSaleCode')
  if (storedPreSaleCode) {
    preSaleCode.value = storedPreSaleCode
    hasPreSaleAccess.value = true
  }
  
  fetchShowDetails()
})

// Fetch show details, performances, and videos
async function fetchShowDetails() {
  loading.value = true
  
  try {
    // Fetch show details
    const { data: showData, error: showError } = await useFetch(`/api/recital-shows/${showId}`, {
      params: hasPreSaleAccess.value ? { pre_sale_code: preSaleCode.value } : {}
    })
    
    if (showError.value) throw new Error(showError.value.message)
    
    show.value = showData.value.show || {}
    
    // Fetch performances
    const { data: performancesData, error: performancesError } = await useFetch(`/api/recital-shows/${showId}/performances`)
    
    if (performancesError.value) {
      console.error('Error fetching performances:', performancesError.value)
      performances.value = []
    } else {
      performances.value = performancesData.value.performances || []
    }
    
    // Fetch videos if available
    const { data: videosData, error: videosError } = await useFetch(`/api/recital-shows/${showId}/videos`)
    
    if (videosError.value) {
      console.error('Error fetching videos:', videosError.value)
      videos.value = []
    } else {
      videos.value = videosData.value.videos || []
    }
  } catch (error) {
    console.error('Error fetching show details:', error)
    useToast().add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load show details',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// Computed properties for ticket availability
const isPreSaleOnly = computed(() => {
  return show.value.is_pre_sale_active && 
         !show.value.can_sell_tickets && 
         new Date() >= new Date(show.value.pre_sale_start) && 
         new Date() <= new Date(show.value.pre_sale_end)
})

const showPreSaleAccess = computed(() => {
  return isPreSaleOnly.value && !hasPreSaleAccess.value
})

const canPurchaseTickets = computed(() => {
  // Regular ticket sales
  if (show.value.can_sell_tickets) return true
  
  // Pre-sale access
  if (hasPreSaleAccess.value && isPreSaleOnly.value) return true
  
  return false
})

const getTicketSectionClass = computed(() => {
  if (canPurchaseTickets.value) return 'bg-green-50 border border-green-200'
  if (isPreSaleOnly.value) return 'bg-purple-50 border border-purple-200'
  if (show.value.ticket_sale_start && new Date(show.value.ticket_sale_start) > new Date()) {
    return 'bg-yellow-50 border border-yellow-200'
  }
  return 'bg-gray-50 border border-gray-200'
})

const getTicketIconClass = computed(() => {
  if (canPurchaseTickets.value) return 'pi-ticket text-green-500'
  if (isPreSaleOnly.value) return 'pi-lock text-purple-500'
  if (show.value.ticket_sale_start && new Date(show.value.ticket_sale_start) > new Date()) {
    return 'pi-calendar text-yellow-500'
  }
  return 'pi-ban text-gray-500'
})

const getTicketStatusTitle = computed(() => {
  if (canPurchaseTickets.value) return 'Tickets Available'
  if (isPreSaleOnly.value) return 'Pre-Sale Only'
  if (show.value.ticket_sale_start && new Date(show.value.ticket_sale_start) > new Date()) {
    return 'Tickets On Sale Soon'
  }
  return 'Tickets Not Available Yet'
})

const getTicketStatusMessage = computed(() => {
  if (canPurchaseTickets.value) {
    return 'Tickets are currently available for purchase. Click "Buy Tickets" to select your seats.'
  }
  if (isPreSaleOnly.value) {
    return 'This show is currently in pre-sale. Enter your pre-sale code to access tickets before the general public.'
  }
  if (show.value.ticket_sale_start && new Date(show.value.ticket_sale_start) > new Date()) {
    return `Tickets will be available for purchase starting ${formatDate(show.value.ticket_sale_start)}.`
  }
  return 'Tickets are not available for purchase at this time.'
})

// Methods
function navigateToSeating() {
  navigateTo(`/public/recitals/${show.value.id}/seating`)
}

function downloadProgramPDF() {
  window.open(`/api/recital-shows/${show.value.id}/program/export`, '_blank')
}

function handleVideoAction(video) {
  selectedVideo.value = video
  showVideoDialog.value = true
}

function navigateToMediaOrder() {
  showVideoDialog.value = false
  navigateTo(`/public/media-order/${show.value.id}?format=${selectedVideo.value.format}`)
}

async function validateVideoAccess() {
  if (!videoAccessCode.value) {
    videoAccessError.value = 'Please enter your access code'
    return
  }
  
  validatingVideoAccess.value = true
  videoAccessError.value = ''
  
  try {
    const { data, error } = await useFetch(`/api/videos/${selectedVideo.value.id}/access`, {
      params: {
        code: videoAccessCode.value
      }
    })
    
    if (error.value) throw new Error(error.value.message)
    
    if (data.value.access) {
      showVideoDialog.value = false
      
      // Open video URL in new tab
      window.open(data.value.video.url, '_blank')
    } else {
      videoAccessError.value = 'Invalid access code'
    }
  } catch (err) {
    console.error('Error validating access code:', err)
    videoAccessError.value = err.message || 'Error validating code'
  } finally {
    validatingVideoAccess.value = false
  }
}

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
      
      // Refresh show details to update ticket availability
      fetchShowDetails()
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

// Helper functions
function formatVideoType(format) {
  switch(format) {
    case 'digital': return 'Digital Streaming'
    case 'DVD': return 'DVD'
    case 'Blu-Ray': return 'Blu-Ray'
    default: return format
  }
}

function getDanceStyleColor(performance) {
  return performance.class_instance?.class_definition?.dance_style?.color || '#cccccc'
}

function getDanceStyleName(performance) {
  return performance.class_instance?.class_definition?.dance_style?.name || 'Dance'
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

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

function formatPrice(cents) {
  if (!cents && cents !== 0) return '0.00'
  return (cents / 100).toFixed(2)
}
</script>
