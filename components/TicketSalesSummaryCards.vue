<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold text-gray-700">Overview</h3>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Revenue -->
      <Card>
        <template #content>
          <div class="metric-card-content">
            <div class="flex items-start justify-between">
              <div>
                <p class="metric-label">Total Revenue</p>
                <p class="metric-value text-green-600">{{ formatCurrency(summary?.totalRevenue) }}</p>
                <p class="metric-sublabel">
                  {{ formatNumber(summary?.totalOrders) }} orders
                </p>
              </div>
              <div class="metric-icon bg-green-100 text-green-700">
                <i class="pi pi-dollar"></i>
              </div>
            </div>
            <div v-if="summary?.totalDiscounts > 0" class="mt-2 pt-2 border-t border-gray-200">
              <p class="text-xs text-gray-600">
                {{ formatCurrency(summary.totalDiscounts) }} in discounts
              </p>
            </div>
          </div>
        </template>
      </Card>

      <!-- Tickets Sold -->
      <Card>
        <template #content>
          <div class="metric-card-content">
            <div class="flex items-start justify-between">
              <div>
                <p class="metric-label">Tickets Sold</p>
                <p class="metric-value text-blue-600">{{ formatNumber(summary?.ticketsSold) }}</p>
                <p class="metric-sublabel">
                  {{ formatCurrency(summary?.avgOrderValue) }} avg
                </p>
              </div>
              <div class="metric-icon bg-blue-100 text-blue-700">
                <i class="pi pi-ticket"></i>
              </div>
            </div>
            <div v-if="projection" class="mt-2 pt-2 border-t border-gray-200">
              <p class="text-xs text-gray-600">
                Projected: {{ formatNumber(projection.projected_tickets) }}
              </p>
            </div>
          </div>
        </template>
      </Card>

      <!-- Unique Customers -->
      <Card>
        <template #content>
          <div class="metric-card-content">
            <div class="flex items-start justify-between">
              <div>
                <p class="metric-label">Unique Customers</p>
                <p class="metric-value text-purple-600">{{ formatNumber(summary?.uniqueCustomers) }}</p>
                <p class="metric-sublabel">
                  {{ ticketsPerCustomer }} tickets/customer
                </p>
              </div>
              <div class="metric-icon bg-purple-100 text-purple-700">
                <i class="pi pi-users"></i>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Sales Velocity -->
      <Card>
        <template #content>
          <div class="metric-card-content">
            <div class="flex items-start justify-between">
              <div>
                <p class="metric-label">Sales Velocity</p>
                <p class="metric-value text-orange-600">{{ velocityDisplay }}</p>
                <p class="metric-sublabel">tickets per day</p>
              </div>
              <div class="metric-icon bg-orange-100 text-orange-700">
                <i class="pi pi-chart-line"></i>
              </div>
            </div>
            <div v-if="projection?.days_until_show >= 0" class="mt-2 pt-2 border-t border-gray-200">
              <p class="text-xs text-gray-600">
                {{ projection.days_until_show }} days until show
              </p>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Summary {
  totalOrders: number
  ticketsSold: number
  totalRevenue: number
  totalDiscounts: number
  avgOrderValue: number
  uniqueCustomers: number
  ticketsPerDay: number
}

interface Projection {
  projected_tickets: number
  projected_revenue: number
  days_until_show: number
  current_velocity: number
}

interface Props {
  summary?: Summary
  projection?: Projection
}

const props = defineProps<Props>()

const ticketsPerCustomer = computed(() => {
  if (!props.summary?.ticketsSold || !props.summary?.uniqueCustomers) return 0
  return (props.summary.ticketsSold / props.summary.uniqueCustomers).toFixed(1)
})

const velocityDisplay = computed(() => {
  const velocity = props.projection?.current_velocity || props.summary?.ticketsPerDay || 0
  return velocity.toFixed(1)
})

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
</script>

<style scoped>
.metric-card-content {
  @apply p-1;
}

.metric-label {
  @apply text-sm text-gray-600 font-medium mb-1;
}

.metric-value {
  @apply text-2xl font-bold mb-1;
}

.metric-sublabel {
  @apply text-sm text-gray-600;
}

.metric-icon {
  @apply w-12 h-12 rounded-lg flex items-center justify-center text-xl flex-shrink-0;
}
</style>
