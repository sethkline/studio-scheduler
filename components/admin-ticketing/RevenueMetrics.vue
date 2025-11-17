<script setup lang="ts">
import type { RevenueBreakdown } from '~/types'

interface Props {
  revenue: RevenueBreakdown
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Format currency
const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

// Calculate percentages
const ticketRevenuePercentage = computed(() => {
  if (props.revenue.total_revenue_in_cents === 0) return 0
  return Math.round((props.revenue.ticket_revenue_in_cents / props.revenue.total_revenue_in_cents) * 100)
})

const upsellRevenuePercentage = computed(() => {
  if (props.revenue.total_revenue_in_cents === 0) return 0
  return Math.round((props.revenue.upsell_revenue_in_cents / props.revenue.total_revenue_in_cents) * 100)
})

// Metric cards data
const metrics = computed(() => [
  {
    title: 'Total Revenue',
    value: formatCurrency(props.revenue.total_revenue_in_cents),
    icon: 'pi-dollar',
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
    subtext: `${props.revenue.total_orders} orders`
  },
  {
    title: 'Ticket Revenue',
    value: formatCurrency(props.revenue.ticket_revenue_in_cents),
    icon: 'pi-ticket',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    subtext: `${ticketRevenuePercentage.value}% of total`
  },
  {
    title: 'Upsell Revenue',
    value: formatCurrency(props.revenue.upsell_revenue_in_cents),
    icon: 'pi-shopping-cart',
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    subtext: `${upsellRevenuePercentage.value}% of total`
  },
  {
    title: 'Tickets Sold',
    value: props.revenue.total_tickets_sold.toString(),
    icon: 'pi-check-circle',
    iconColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    subtext: 'Total tickets'
  },
  {
    title: 'Pending Revenue',
    value: formatCurrency(props.revenue.pending_revenue_in_cents),
    icon: 'pi-clock',
    iconColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    subtext: 'Awaiting payment'
  },
  {
    title: 'Refunded',
    value: formatCurrency(props.revenue.refunded_revenue_in_cents),
    icon: 'pi-replay',
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50',
    subtext: 'Total refunded'
  }
])
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <Card
      v-for="metric in metrics"
      :key="metric.title"
      class="shadow-sm hover:shadow-md transition-shadow"
    >
      <template #content>
        <div v-if="loading" class="animate-pulse">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div class="h-8 bg-gray-200 rounded w-32 mb-2"></div>
              <div class="h-3 bg-gray-200 rounded w-20"></div>
            </div>
            <div class="w-12 h-12 bg-gray-200 rounded-lg"></div>
          </div>
        </div>

        <div v-else class="flex items-start justify-between">
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-600 mb-1">{{ metric.title }}</p>
            <p class="text-2xl font-bold text-gray-900 mb-1">{{ metric.value }}</p>
            <p class="text-xs text-gray-500">{{ metric.subtext }}</p>
          </div>
          <div :class="['flex items-center justify-center w-12 h-12 rounded-lg', metric.bgColor]">
            <i :class="['pi text-xl', metric.icon, metric.iconColor]"></i>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
