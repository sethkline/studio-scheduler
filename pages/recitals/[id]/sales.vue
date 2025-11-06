<template>
  <div class="sales-analytics-page">
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-3xl font-bold text-gray-900">Ticket Sales Analytics</h1>
          <span
            v-if="isLive"
            class="live-badge"
            :class="{ 'pulse': recentUpdate }"
          >
            <i class="pi pi-circle-fill text-xs"></i>
            Live
          </span>
        </div>
        <p class="text-gray-600 mt-1">{{ recital?.name }}</p>
      </div>
      <div class="flex gap-3">
        <Button
          label="Export to CSV"
          icon="pi pi-download"
          severity="secondary"
          outlined
          @click="exportSales"
          :loading="exporting"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          @click="loadAnalytics"
          :loading="loading"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <i class="pi pi-exclamation-triangle text-4xl text-red-500 mb-3"></i>
      <p class="text-red-700">{{ error }}</p>
      <Button label="Retry" icon="pi pi-refresh" @click="loadAnalytics" class="mt-4" />
    </div>

    <!-- Analytics Content -->
    <div v-else class="space-y-6">
      <!-- Summary Cards -->
      <TicketSalesSummaryCards :summary="analytics?.summary" :projection="analytics?.projection" />

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesVelocityChart :data="analytics?.salesVelocity" />
        <SalesChannelChart :data="analytics?.channelBreakdown" />
      </div>

      <!-- Seat Map Visualization -->
      <SeatAvailabilityCard :seating="analytics?.seating" />

      <!-- Show Breakdown Table -->
      <ShowSalesBreakdown :shows="analytics?.showBreakdown" />

      <!-- Additional Analytics -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PeakSalesHoursCard :hours="analytics?.peakSalesHours" />
        <DiscountEffectivenessCard :discounts="analytics?.discountEffectiveness" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'staff']
})

const route = useRoute()
const recitalId = route.params.id as string
const supabase = useSupabaseClient()

const loading = ref(true)
const exporting = ref(false)
const error = ref<string | null>(null)
const analytics = ref<any>(null)
const recital = ref<any>(null)
const isLive = ref(false)
const recentUpdate = ref(false)

// Track realtime channels for cleanup
let ticketChannel: any = null
let orderChannel: any = null

// Load analytics data
const loadAnalytics = async () => {
  loading.value = true
  error.value = null

  try {
    // Load recital info
    const { data: recitalData } = await useFetch(`/api/recitals/${recitalId}`)
    recital.value = recitalData.value

    // Load analytics
    const { data, error: fetchError } = await useFetch(`/api/recitals/${recitalId}/sales-analytics`)

    if (fetchError.value) {
      throw new Error(fetchError.value.message)
    }

    analytics.value = data.value
  } catch (err: any) {
    error.value = err.message || 'Failed to load analytics'
    console.error('Analytics error:', err)
  } finally {
    loading.value = false
  }
}

// Show visual feedback when data updates
const triggerUpdateIndicator = () => {
  recentUpdate.value = true
  setTimeout(() => {
    recentUpdate.value = false
  }, 2000)
}

// Set up real-time subscriptions for ticket sales
const setupRealtimeSubscriptions = async () => {
  // Get show IDs for this recital
  const { data: shows } = await supabase
    .from('recital_shows')
    .select('id')
    .eq('recital_id', recitalId)

  const showIds = shows?.map(s => s.id) || []

  // Subscribe to ticket changes
  if (showIds.length > 0) {
    ticketChannel = supabase
      .channel('sales-ticket-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tickets',
        filter: `show_id=in.(${showIds.join(',')})`
      }, async (payload) => {
        console.log('Ticket sale update:', payload)
        // Reload analytics when tickets change
        await loadAnalytics()
        triggerUpdateIndicator()
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isLive.value = true
        }
      })

    // Subscribe to order changes
    orderChannel = supabase
      .channel('sales-order-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `show_id=in.(${showIds.join(',')})`
      }, async (payload) => {
        console.log('Order update:', payload)
        // Reload analytics when orders change
        await loadAnalytics()
        triggerUpdateIndicator()
      })
      .subscribe()
  }
}

// Cleanup realtime subscriptions
const cleanupRealtimeSubscriptions = () => {
  if (ticketChannel) {
    supabase.removeChannel(ticketChannel)
    ticketChannel = null
  }
  if (orderChannel) {
    supabase.removeChannel(orderChannel)
    orderChannel = null
  }
  isLive.value = false
}

// Export sales data
const exportSales = async () => {
  exporting.value = true

  try {
    // Trigger download
    window.open(`/api/recitals/${recitalId}/sales-export`, '_blank')
  } catch (err: any) {
    console.error('Export error:', err)
  } finally {
    exporting.value = false
  }
}

onMounted(async () => {
  await loadAnalytics()
  await setupRealtimeSubscriptions()
})

onUnmounted(() => {
  cleanupRealtimeSubscriptions()
})
</script>

<style scoped>
.sales-analytics-page {
  @apply p-6 max-w-7xl mx-auto;
}

.live-badge {
  @apply inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full;
}

.live-badge i {
  @apply text-green-600;
}

.pulse {
  animation: pulse 2s ease-in-out;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}
</style>
