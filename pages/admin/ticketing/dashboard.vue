<script setup lang="ts">
/**
 * Ticketing Dashboard Page
 * Displays sales metrics, charts, and analytics
 */

definePageMeta({
  middleware: 'admin',
  layout: 'default'
})

interface DashboardData {
  metrics: {
    total_tickets_sold: number
    total_revenue_cents: number
    total_orders: number
    average_order_value_cents: number
  }
  show_stats: Array<{
    show_id: string
    show_title: string
    show_date: string
    show_time: string | null
    venue_name: string | null
    venue_capacity: number | null
    tickets_sold: number
    total_revenue_cents: number
  }>
  recent_orders: Array<{
    id: string
    order_number: string
    customer_name: string
    customer_email: string
    total_amount_cents: number
    status: string
    created_at: string
    show_title: string
    show_date: string
    ticket_count: number
  }>
  upcoming_shows: Array<{
    id: string
    title: string
    show_date: string
    show_time: string | null
    venue_name: string | null
    capacity: number
    sold: number
    available: number
    sold_percentage: number
  }>
  seat_heat_map: Array<{
    section: string
    row: string
    total_seats: number
    sold_seats: number
    reserved_seats: number
    available_seats: number
  }>
}

const toast = useToast()

// State
const loading = ref(true)
const dashboardData = ref<DashboardData | null>(null)
const dateRange = ref<Date[] | null>(null)
const autoRefresh = ref(false)
const refreshInterval = ref<NodeJS.Timeout | null>(null)

// Computed date filters
const dateFrom = computed(() => {
  if (!dateRange.value || !dateRange.value[0]) return undefined
  return dateRange.value[0].toISOString().split('T')[0]
})

const dateTo = computed(() => {
  if (!dateRange.value || !dateRange.value[1]) return undefined
  return dateRange.value[1].toISOString().split('T')[0]
})

/**
 * Fetch dashboard data
 */
const fetchDashboardData = async () => {
  try {
    loading.value = true

    const params: Record<string, string> = {}
    if (dateFrom.value) params.date_from = dateFrom.value
    if (dateTo.value) params.date_to = dateTo.value

    const { data, error } = await useFetch('/api/admin/ticketing/dashboard', {
      params
    })

    if (error.value) {
      throw new Error(error.value.message || 'Failed to fetch dashboard data')
    }

    dashboardData.value = data.value as DashboardData
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load dashboard data',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

/**
 * Apply date filter
 */
const applyDateFilter = () => {
  fetchDashboardData()
}

/**
 * Clear date filter
 */
const clearDateFilter = () => {
  dateRange.value = null
  fetchDashboardData()
}

/**
 * Set predefined date ranges
 */
const setDateRange = (range: 'today' | 'week' | 'month' | 'year') => {
  const today = new Date()
  const start = new Date()

  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      dateRange.value = [start, today]
      break
    case 'week':
      start.setDate(today.getDate() - 7)
      dateRange.value = [start, today]
      break
    case 'month':
      start.setMonth(today.getMonth() - 1)
      dateRange.value = [start, today]
      break
    case 'year':
      start.setFullYear(today.getFullYear() - 1)
      dateRange.value = [start, today]
      break
  }

  fetchDashboardData()
}

/**
 * Toggle auto refresh
 */
const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value

  if (autoRefresh.value) {
    // Refresh every 30 seconds
    refreshInterval.value = setInterval(() => {
      fetchDashboardData()
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

/**
 * Refresh dashboard
 */
const refreshDashboard = () => {
  fetchDashboardData()
  toast.add({
    severity: 'success',
    summary: 'Refreshed',
    detail: 'Dashboard data updated',
    life: 2000
  })
}

// Lifecycle hooks
onMounted(() => {
  fetchDashboardData()
})

onBeforeUnmount(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})

// Watch for date range changes
watch(dateRange, (newValue) => {
  if (newValue === null) {
    fetchDashboardData()
  }
})
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Ticketing Dashboard</h1>
        <p class="text-gray-600 mt-1">Sales metrics and analytics</p>
      </div>

      <div class="flex items-center gap-2">
        <Button
          :icon="autoRefresh ? 'pi pi-pause' : 'pi pi-refresh'"
          :label="autoRefresh ? 'Pause' : 'Auto-refresh'"
          :severity="autoRefresh ? 'warning' : 'secondary'"
          outlined
          @click="toggleAutoRefresh"
        />
        <Button
          icon="pi pi-sync"
          label="Refresh"
          outlined
          @click="refreshDashboard"
          :loading="loading"
        />
      </div>
    </div>

    <!-- Date Range Filter -->
    <Card class="border border-gray-200">
      <template #content>
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2">
            <label class="text-sm font-semibold text-gray-700">Date Range:</label>
            <Calendar
              v-model="dateRange"
              selection-mode="range"
              :manual-input="false"
              date-format="mm/dd/yy"
              placeholder="Select date range"
              show-icon
              class="w-80"
            />
          </div>

          <div class="flex items-center gap-2">
            <Button
              label="Today"
              size="small"
              outlined
              @click="setDateRange('today')"
            />
            <Button
              label="Last 7 Days"
              size="small"
              outlined
              @click="setDateRange('week')"
            />
            <Button
              label="Last 30 Days"
              size="small"
              outlined
              @click="setDateRange('month')"
            />
            <Button
              label="Last Year"
              size="small"
              outlined
              @click="setDateRange('year')"
            />
            <Button
              label="Clear"
              size="small"
              severity="secondary"
              outlined
              @click="clearDateFilter"
              :disabled="!dateRange"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Metrics Cards -->
    <AdminTicketingRevenueMetrics
      v-if="dashboardData"
      :metrics="dashboardData.metrics"
      :loading="loading"
    />

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Sales Chart -->
      <AdminTicketingSalesChart
        v-if="dashboardData"
        :show-stats="dashboardData.show_stats"
        :loading="loading"
      />

      <!-- Upcoming Shows -->
      <AdminTicketingUpcomingShows
        v-if="dashboardData"
        :upcoming-shows="dashboardData.upcoming_shows"
        :loading="loading"
      />
    </div>

    <!-- Seat Heat Map -->
    <AdminTicketingSeatHeatMap
      v-if="dashboardData"
      :seat-heat-map="dashboardData.seat_heat_map"
      :loading="loading"
    />

    <!-- Recent Orders -->
    <AdminTicketingRecentOrders
      v-if="dashboardData"
      :recent-orders="dashboardData.recent_orders"
      :loading="loading"
    />
  </div>
</template>
