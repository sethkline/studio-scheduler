<template>
  <div class="recital-hub">
    <!-- Page Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">
            {{ recital?.name || 'Loading...' }}
          </h1>
          <div class="flex items-center gap-2 mt-1">
            <p class="text-gray-600">Recital Command Center</p>
            <span
              v-if="isLive"
              class="live-badge"
              :class="{ 'pulse': recentUpdate }"
            >
              <i class="pi pi-circle-fill text-xs"></i>
              Live
            </span>
          </div>
        </div>
        <div class="flex gap-3">
          <Button
            label="View Program"
            icon="pi pi-book"
            severity="secondary"
            outlined
            @click="navigateTo(`/recitals/${recitalId}/program`)"
          />
          <Button
            label="Public Page"
            icon="pi pi-external-link"
            severity="secondary"
            outlined
            @click="navigateTo(`/public/recitals/${recital?.public_slug}`)"
            v-if="recital?.is_public && recital?.public_slug"
          />
        </div>
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
      <Button label="Retry" icon="pi pi-refresh" @click="loadDashboard" class="mt-4" />
    </div>

    <!-- Dashboard Content -->
    <div v-else class="space-y-6">
      <!-- Countdown and Overall Progress -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecitalCountdown :countdown="metrics?.countdown" :recital-date="recital?.date" />
        <RecitalOverallProgress
          :completion="metrics?.metrics?.overallCompletion"
          :at-risk-items="metrics?.atRiskItems"
        />
        <RecitalQuickLinks :recital-id="recitalId" />
      </div>

      <!-- Key Metrics Cards -->
      <RecitalMetricsCards :metrics="metrics?.metrics" :progress="metrics?.progress" />

      <!-- Progress Bars for Major Milestones -->
      <RecitalProgressBars :progress="metrics?.progress" />

      <!-- Two Column Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent Activity Feed -->
        <RecitalActivityFeed :recital-id="recitalId" />

        <!-- Assigned Staff -->
        <RecitalAssignedStaff :staff="metrics?.assignedStaff" />
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
const error = ref<string | null>(null)
const metrics = ref<any>(null)
const recital = ref<any>(null)
const isLive = ref(false)
const recentUpdate = ref(false)

// Track realtime channels for cleanup
let ticketChannel: any = null
let taskChannel: any = null
let volunteerChannel: any = null

// Load dashboard data
const loadDashboard = async () => {
  loading.value = true
  error.value = null

  try {
    const { data, error: fetchError } = await useFetch(`/api/recitals/${recitalId}/dashboard-metrics`)

    if (fetchError.value) {
      throw new Error(fetchError.value.message)
    }

    metrics.value = data.value
    recital.value = data.value?.recital
  } catch (err: any) {
    error.value = err.message || 'Failed to load dashboard'
    console.error('Dashboard error:', err)
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

// Set up real-time subscriptions
const setupRealtimeSubscriptions = async () => {
  // Get show IDs for this recital
  const { data: shows } = await supabase
    .from('recital_shows')
    .select('id')
    .eq('recital_id', recitalId)

  const showIds = shows?.map(s => s.id) || []

  // Subscribe to ticket sales
  if (showIds.length > 0) {
    ticketChannel = supabase
      .channel('ticket-sales-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tickets',
        filter: `show_id=in.(${showIds.join(',')})`
      }, async (payload) => {
        console.log('Ticket update:', payload)
        // Reload metrics when tickets change
        await loadDashboard()
        triggerUpdateIndicator()
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isLive.value = true
        }
      })
  }

  // Subscribe to task completions
  taskChannel = supabase
    .channel('task-updates')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'recital_tasks',
      filter: `recital_id=eq.${recitalId}`
    }, async (payload) => {
      console.log('Task update:', payload)
      // Reload metrics when tasks change
      await loadDashboard()
      triggerUpdateIndicator()
    })
    .subscribe()

  // Subscribe to volunteer signups
  volunteerChannel = supabase
    .channel('volunteer-updates')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'volunteer_signups'
    }, async (payload) => {
      console.log('Volunteer update:', payload)
      // Check if this signup is for a shift in this recital
      const { data: shift } = await supabase
        .from('volunteer_shifts')
        .select('recital_id')
        .eq('id', payload.new?.shift_id || payload.old?.shift_id)
        .single()

      if (shift?.recital_id === recitalId) {
        await loadDashboard()
        triggerUpdateIndicator()
      }
    })
    .subscribe()
}

// Cleanup realtime subscriptions
const cleanupRealtimeSubscriptions = () => {
  if (ticketChannel) {
    supabase.removeChannel(ticketChannel)
    ticketChannel = null
  }
  if (taskChannel) {
    supabase.removeChannel(taskChannel)
    taskChannel = null
  }
  if (volunteerChannel) {
    supabase.removeChannel(volunteerChannel)
    volunteerChannel = null
  }
  isLive.value = false
}

onMounted(async () => {
  await loadDashboard()
  await setupRealtimeSubscriptions()
})

onUnmounted(() => {
  cleanupRealtimeSubscriptions()
})
</script>

<style scoped>
.recital-hub {
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
