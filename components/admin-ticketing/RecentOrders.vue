<script setup lang="ts">
/**
 * RecentOrders Component
 * Displays the most recent ticket orders
 */

interface RecentOrder {
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
}

interface Props {
  recentOrders: RecentOrder[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const router = useRouter()

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
 * Format date to relative time
 */
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Format show date
 */
const formatShowDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Get status badge severity
 */
const getStatusSeverity = (status: string): string => {
  switch (status) {
    case 'confirmed':
      return 'success'
    case 'pending':
      return 'warning'
    case 'cancelled':
      return 'danger'
    case 'refunded':
      return 'secondary'
    default:
      return 'info'
  }
}

/**
 * Navigate to order details
 */
const viewOrder = (orderId: string) => {
  router.push(`/admin/ticketing/orders/${orderId}`)
}
</script>

<template>
  <Card class="border border-gray-200">
    <template #header>
      <div class="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Recent Orders</h3>
          <p class="text-sm text-gray-600 mt-1">Latest ticket purchases</p>
        </div>
        <Button
          label="View All"
          icon="pi pi-arrow-right"
          icon-pos="right"
          text
          @click="router.push('/admin/ticketing/orders')"
        />
      </div>
    </template>

    <template #content>
      <div v-if="loading" class="p-4 space-y-2">
        <Skeleton height="3rem" class="mb-2" />
        <Skeleton height="3rem" class="mb-2" />
        <Skeleton height="3rem" class="mb-2" />
      </div>

      <div v-else-if="recentOrders.length === 0" class="text-center py-12">
        <i class="pi pi-shopping-cart text-4xl text-gray-400 mb-4" />
        <p class="text-gray-600">No recent orders</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Order #
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Customer
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Show
              </th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Tickets
              </th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                Amount
              </th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Status
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Time
              </th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="order in recentOrders"
              :key="order.id"
              class="hover:bg-gray-50 cursor-pointer transition-colors"
              @click="viewOrder(order.id)"
            >
              <td class="px-4 py-3">
                <span class="font-mono text-sm text-gray-900">{{
                  order.order_number
                }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="text-sm">
                  <div class="font-medium text-gray-900">{{ order.customer_name }}</div>
                  <div class="text-gray-600">{{ order.customer_email }}</div>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="text-sm">
                  <div class="font-medium text-gray-900">{{ order.show_title }}</div>
                  <div class="text-gray-600">{{ formatShowDate(order.show_date) }}</div>
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  {{ order.ticket_count }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <span class="font-semibold text-gray-900">{{
                  formatCurrency(order.total_amount_cents)
                }}</span>
              </td>
              <td class="px-4 py-3 text-center">
                <Tag
                  :value="order.status"
                  :severity="getStatusSeverity(order.status)"
                  class="capitalize"
                />
              </td>
              <td class="px-4 py-3">
                <span class="text-sm text-gray-600">{{
                  formatRelativeTime(order.created_at)
                }}</span>
              </td>
              <td class="px-4 py-3 text-right">
                <Button
                  icon="pi pi-eye"
                  text
                  rounded
                  @click.stop="viewOrder(order.id)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </Card>
</template>
