<template>
  <div class="metrics-cards-container">
    <h3 class="text-lg font-semibold text-gray-700 mb-4">Key Metrics</h3>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Tickets Sold -->
      <Card class="metric-card">
        <template #content>
          <div class="flex items-start justify-between">
            <div>
              <p class="metric-label">Tickets Sold</p>
              <p class="metric-value">{{ formatNumber(metrics?.ticketsSold) }}</p>
              <p class="metric-sublabel text-green-600">
                {{ formatCurrency(metrics?.revenue) }} revenue
              </p>
            </div>
            <div class="metric-icon bg-green-100 text-green-700">
              <i class="pi pi-ticket"></i>
            </div>
          </div>
        </template>
      </Card>

      <!-- Tasks Progress -->
      <Card class="metric-card">
        <template #content>
          <div class="flex items-start justify-between">
            <div>
              <p class="metric-label">Tasks Complete</p>
              <p class="metric-value">
                {{ progress?.tasks?.completed || 0 }}/{{ progress?.tasks?.total || 0 }}
              </p>
              <p
                class="metric-sublabel"
                :class="getTaskStatusClass(progress?.tasks?.overdue)"
              >
                {{ getTaskStatusText(progress?.tasks?.overdue) }}
              </p>
            </div>
            <div class="metric-icon bg-blue-100 text-blue-700">
              <i class="pi pi-check-circle"></i>
            </div>
          </div>
        </template>
      </Card>

      <!-- Volunteers -->
      <Card class="metric-card">
        <template #content>
          <div class="flex items-start justify-between">
            <div>
              <p class="metric-label">Volunteer Spots</p>
              <p class="metric-value">
                {{ progress?.volunteers?.filled || 0 }}/{{ progress?.volunteers?.total || 0 }}
              </p>
              <p
                class="metric-sublabel"
                :class="getVolunteerStatusClass(progress?.volunteers?.percentage)"
              >
                {{ progress?.volunteers?.percentage || 0 }}% filled
              </p>
            </div>
            <div class="metric-icon bg-purple-100 text-purple-700">
              <i class="pi pi-users"></i>
            </div>
          </div>
        </template>
      </Card>

      <!-- Unique Customers -->
      <Card class="metric-card">
        <template #content>
          <div class="flex items-start justify-between">
            <div>
              <p class="metric-label">Unique Customers</p>
              <p class="metric-value">{{ formatNumber(progress?.tickets?.uniqueCustomers) }}</p>
              <p class="metric-sublabel text-gray-600">
                Avg: {{ formatCurrency(progress?.tickets?.averageOrderValue) }}
              </p>
            </div>
            <div class="metric-icon bg-orange-100 text-orange-700">
              <i class="pi pi-user"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Metrics {
  ticketsSold?: number
  revenue?: number
  tasksCompleted?: number
  totalTasks?: number
  volunteersFilledSpots?: number
  volunteerTotalSpots?: number
}

interface Progress {
  tasks?: {
    completed: number
    total: number
    percentage: number
    overdue: number
  }
  volunteers?: {
    filled: number
    total: number
    percentage: number
    unfilled: number
  }
  tickets?: {
    sold: number
    revenue: number
    averageOrderValue: number
    uniqueCustomers: number
  }
}

interface Props {
  metrics?: Metrics
  progress?: Progress
}

defineProps<Props>()

const formatNumber = (value?: number) => {
  return value?.toLocaleString() || '0'
}

const formatCurrency = (value?: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0)
}

const getTaskStatusClass = (overdue?: number) => {
  if (!overdue || overdue === 0) return 'text-green-600'
  return 'text-red-600'
}

const getTaskStatusText = (overdue?: number) => {
  if (!overdue || overdue === 0) return 'All on track'
  return `${overdue} overdue`
}

const getVolunteerStatusClass = (percentage?: number) => {
  const pct = percentage || 0
  if (pct >= 80) return 'text-green-600'
  if (pct >= 50) return 'text-orange-600'
  return 'text-red-600'
}
</script>

<style scoped>
.metrics-cards-container {
  @apply space-y-4;
}

.metric-card {
  @apply h-full;
}

.metric-label {
  @apply text-sm text-gray-600 font-medium mb-1;
}

.metric-value {
  @apply text-3xl font-bold text-gray-900 mb-1;
}

.metric-sublabel {
  @apply text-sm font-medium;
}

.metric-icon {
  @apply w-12 h-12 rounded-lg flex items-center justify-center text-xl;
}
</style>
