<script setup lang="ts">
import type { OrderWithDetails } from '~/types'

interface Props {
  orders: OrderWithDetails[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const router = useRouter()

// Format currency
const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

// Format date/time
const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

// Get status badge severity
const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'paid':
      return 'success'
    case 'pending':
      return 'warn'
    case 'failed':
      return 'danger'
    case 'refunded':
      return 'info'
    case 'cancelled':
      return 'secondary'
    default:
      return 'secondary'
  }
}

// Navigate to order details
const viewOrder = (orderId: string) => {
  router.push(`/admin/ticketing/orders/${orderId}`)
}
</script>

<template>
  <Card class="h-full">
    <template #title>
      <div class="flex items-center justify-between">
        <h3 class="text-xl font-bold text-gray-900">Recent Orders</h3>
        <Button
          label="View All"
          size="small"
          text
          @click="router.push('/admin/ticketing/orders')"
        />
      </div>
    </template>
    <template #content>
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="animate-pulse">
          <div class="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>

      <div v-else-if="orders.length === 0" class="flex justify-center items-center h-48 text-gray-500">
        <div class="text-center">
          <i class="pi pi-shopping-cart text-4xl mb-2"></i>
          <p>No recent orders</p>
        </div>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="order in orders"
          :key="order.id"
          class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
          @click="viewOrder(order.id)"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold text-gray-900">{{ order.order_number }}</span>
                <Tag
                  :value="order.status.toUpperCase()"
                  :severity="getStatusSeverity(order.status)"
                  class="text-xs"
                />
              </div>
              <div class="text-sm text-gray-600">
                {{ order.customer_name }}
              </div>
            </div>
            <div class="text-right">
              <div class="font-semibold text-gray-900">
                {{ formatCurrency(order.total_amount_in_cents) }}
              </div>
              <div class="text-xs text-gray-500">
                {{ order.ticket_count }} {{ order.ticket_count === 1 ? 'ticket' : 'tickets' }}
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <div class="flex items-center gap-4">
              <span v-if="order.show" class="flex items-center gap-1">
                <i class="pi pi-ticket"></i>
                {{ order.show.title }}
              </span>
              <span class="flex items-center gap-1">
                <i class="pi pi-clock"></i>
                {{ formatDateTime(order.created_at) }}
              </span>
            </div>
            <i class="pi pi-chevron-right text-gray-400"></i>
          </div>
        </div>
      </div>

      <!-- View all button at bottom -->
      <div v-if="!loading && orders.length > 0" class="mt-4 text-center">
        <Button
          label="View All Orders"
          outlined
          size="small"
          @click="router.push('/admin/ticketing/orders')"
          class="w-full"
        />
      </div>
    </template>
  </Card>
</template>
