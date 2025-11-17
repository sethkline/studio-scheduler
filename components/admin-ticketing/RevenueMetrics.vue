<script setup lang="ts">
/**
 * RevenueMetrics Component
 * Displays key revenue and sales metrics with cards
 */

interface Props {
  metrics: {
    total_tickets_sold: number
    total_revenue_cents: number
    total_orders: number
    average_order_value_cents: number
  }
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

/**
 * Format currency in cents to dollars
 */
const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

/**
 * Format number with commas
 */
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num)
}

const metricsCards = computed(() => [
  {
    label: 'Total Revenue',
    value: formatCurrency(props.metrics.total_revenue_cents),
    icon: 'pi pi-dollar',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    label: 'Tickets Sold',
    value: formatNumber(props.metrics.total_tickets_sold),
    icon: 'pi pi-ticket',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    label: 'Total Orders',
    value: formatNumber(props.metrics.total_orders),
    icon: 'pi pi-shopping-cart',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    label: 'Avg Order Value',
    value: formatCurrency(props.metrics.average_order_value_cents),
    icon: 'pi pi-chart-line',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  }
])
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card
      v-for="(metric, index) in metricsCards"
      :key="index"
      class="border border-gray-200"
    >
      <template #content>
        <div v-if="loading" class="space-y-2">
          <Skeleton height="2rem" class="mb-2" />
          <Skeleton height="3rem" />
        </div>

        <div v-else class="flex items-start justify-between">
          <div class="flex-1">
            <p class="text-sm text-gray-600 mb-1">{{ metric.label }}</p>
            <p class="text-3xl font-bold text-gray-900">{{ metric.value }}</p>
          </div>
          <div :class="[metric.bgColor, 'p-3 rounded-lg']">
            <i :class="[metric.icon, metric.color, 'text-2xl']" />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
