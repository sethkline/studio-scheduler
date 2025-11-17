<script setup lang="ts">
import type { DashboardData, DashboardFilters } from '~/types'

definePageMeta({
  middleware: 'admin'
})

// State
const loading = ref(true)
const dashboardData = ref<DashboardData | null>(null)
const error = ref<string | null>(null)

// Filters
const filters = ref<DashboardFilters>({
  date_from: undefined,
  date_to: undefined,
  show_id: undefined
})

// Date range shortcuts
const dateRangeOptions = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 90 Days', value: 90 },
  { label: 'Custom', value: 'custom' }
]

const selectedDateRange = ref(30) // Default to last 30 days

// Auto-refresh
const autoRefresh = ref(false)
const refreshInterval = ref<NodeJS.Timeout | null>(null)

// Toast
const toast = useToast()

// Fetch dashboard data
const fetchDashboard = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await $fetch('/api/admin/ticketing/dashboard', {
      params: filters.value
    })

    if (response.success) {
      dashboardData.value = response.data
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load dashboard data'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

// Apply date range filter
const applyDateRange = (days: number | string) => {
  if (days === 'custom') {
    // User will set custom dates
    return
  }

  const now = new Date()
  const startDate = new Date(now.getTime() - (days as number) * 24 * 60 * 60 * 1000)

  filters.value.date_from = startDate.toISOString().split('T')[0]
  filters.value.date_to = now.toISOString().split('T')[0]

  fetchDashboard()
}

// Watch for date range changes
watch(selectedDateRange, (newValue) => {
  applyDateRange(newValue)
})

// Toggle auto-refresh
const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value

  if (autoRefresh.value) {
    // Refresh every 30 seconds
    refreshInterval.value = setInterval(() => {
      fetchDashboard()
    }, 30000)
    toast.add({
      severity: 'info',
      summary: 'Auto-refresh enabled',
      detail: 'Dashboard will refresh every 30 seconds',
      life: 3000
    })
  } else {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value)
      refreshInterval.value = null
    }
    toast.add({
      severity: 'info',
      summary: 'Auto-refresh disabled',
      life: 3000
    })
  }
}

// Cleanup on unmount
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})

// Initial load
onMounted(() => {
  applyDateRange(selectedDateRange.value)
})

// Format date for display
const formatDateRange = computed(() => {
  if (!dashboardData.value) return ''

  const start = new Date(dashboardData.value.date_range.start_date)
  const end = new Date(dashboardData.value.date_range.end_date)

  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
})
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Ticketing Dashboard</h1>
        <p class="text-gray-600 mt-1">{{ formatDateRange }}</p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Date range selector -->
        <Dropdown
          v-model="selectedDateRange"
          :options="dateRangeOptions"
          option-label="label"
          option-value="value"
          placeholder="Select date range"
          class="w-48"
        />

        <!-- Auto-refresh toggle -->
        <Button
          :label="autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'"
          :severity="autoRefresh ? 'success' : 'secondary'"
          :icon="autoRefresh ? 'pi pi-pause' : 'pi pi-play'"
          @click="toggleAutoRefresh"
          outlined
        />

        <!-- Refresh button -->
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          @click="fetchDashboard"
          :loading="loading"
        />
      </div>
    </div>

    <!-- Error message -->
    <Message v-if="error && !loading" severity="error" :closable="true" @close="error = null">
      {{ error }}
    </Message>

    <!-- Dashboard content -->
    <div class="space-y-6">
      <!-- Revenue Metrics -->
      <section>
        <RevenueMetrics
          :revenue="dashboardData?.revenue_breakdown || {
            total_revenue_in_cents: 0,
            ticket_revenue_in_cents: 0,
            upsell_revenue_in_cents: 0,
            pending_revenue_in_cents: 0,
            refunded_revenue_in_cents: 0,
            total_orders: 0,
            total_tickets_sold: 0
          }"
          :loading="loading"
        />
      </section>

      <!-- Charts Row -->
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Sales Chart -->
        <SalesChart
          :show-stats="dashboardData?.show_sales_stats || []"
          :loading="loading"
        />

        <!-- Seat Heat Map -->
        <SeatHeatMap
          :show-stats="dashboardData?.show_sales_stats || []"
          :loading="loading"
        />
      </section>

      <!-- Recent Orders and Upcoming Shows -->
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent Orders -->
        <RecentOrders
          :orders="dashboardData?.recent_orders || []"
          :loading="loading"
        />

        <!-- Upcoming Shows -->
        <Card>
          <template #title>
            <h3 class="text-xl font-bold text-gray-900">Upcoming Shows</h3>
          </template>
          <template #content>
            <div v-if="loading" class="space-y-3">
              <div v-for="i in 5" :key="i" class="animate-pulse">
                <div class="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>

            <div
              v-else-if="!dashboardData?.upcoming_shows || dashboardData.upcoming_shows.length === 0"
              class="flex justify-center items-center h-48 text-gray-500"
            >
              <div class="text-center">
                <i class="pi pi-calendar text-4xl mb-2"></i>
                <p>No upcoming shows</p>
              </div>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="show in dashboardData.upcoming_shows"
                :key="show.show_id"
                class="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h4 class="font-semibold text-gray-900 mb-1">{{ show.show_title }}</h4>
                    <div class="text-sm text-gray-600 mb-2">
                      {{ new Date(show.show_date).toLocaleDateString() }} at
                      {{ show.show_time }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ show.sold_seats }} / {{ show.total_seats }} sold
                      ({{ show.sold_percentage }}%)
                    </div>
                  </div>
                  <div class="text-right">
                    <div
                      :class="[
                        'text-sm font-semibold px-2 py-1 rounded',
                        show.sold_percentage >= 75
                          ? 'bg-green-100 text-green-800'
                          : show.sold_percentage >= 50
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      ]"
                    >
                      {{ show.available_seats }} left
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </Card>
      </section>
    </div>
  </div>
</template>
