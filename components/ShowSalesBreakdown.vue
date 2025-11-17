<template>
  <Card>
    <template #content>
      <div>
        <h3 class="text-lg font-semibold text-gray-700 mb-4">Sales by Show</h3>

        <div v-if="!shows || shows.length === 0" class="text-center py-8 text-gray-500">
          <i class="pi pi-calendar text-4xl mb-3"></i>
          <p>No show data available</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-200">
                <th class="table-header">Show Date</th>
                <th class="table-header">Time</th>
                <th class="table-header text-right">Orders</th>
                <th class="table-header text-right">Tickets</th>
                <th class="table-header text-right">Revenue</th>
                <th class="table-header text-right">Avg Order</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="show in shows"
                :key="show.showId"
                class="border-b border-gray-100 hover:bg-gray-50"
              >
                <td class="table-cell">
                  {{ formatDate(show.date) }}
                </td>
                <td class="table-cell">
                  {{ formatTime(show.time) }}
                </td>
                <td class="table-cell text-right">
                  {{ show.orders }}
                  <div class="text-xs text-gray-500">
                    <span v-if="show.onlineOrders">{{ show.onlineOrders }} online</span>
                    <span v-if="show.boxOfficeOrders"> • {{ show.boxOfficeOrders }} box office</span>
                  </div>
                </td>
                <td class="table-cell text-right font-semibold">
                  {{ show.ticketsSold }}
                </td>
                <td class="table-cell text-right font-semibold text-green-600">
                  {{ formatCurrency(show.revenue) }}
                </td>
                <td class="table-cell text-right text-gray-600">
                  {{ formatCurrency(show.avgOrderValue) }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-gray-300 font-semibold">
                <td colspan="2" class="table-cell">Total</td>
                <td class="table-cell text-right">{{ totalOrders }}</td>
                <td class="table-cell text-right">{{ totalTickets }}</td>
                <td class="table-cell text-right text-green-600">{{ formatCurrency(totalRevenue) }}</td>
                <td class="table-cell text-right">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
interface Show {
  showId: string
  date: string
  time: string
  orders: number
  ticketsSold: number
  revenue: number
  avgOrderValue: number
  onlineOrders?: number
  boxOfficeOrders?: number
  phoneOrders?: number
}

interface Props {
  shows?: Show[]
}

const props = defineProps<Props>()

const totalOrders = computed(() => {
  return props.shows?.reduce((sum, show) => sum + show.orders, 0) || 0
})

const totalTickets = computed(() => {
  return props.shows?.reduce((sum, show) => sum + show.ticketsSold, 0) || 0
})

const totalRevenue = computed(() => {
  return props.shows?.reduce((sum, show) => sum + show.revenue, 0) || 0
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

const formatTime = (timeString: string) => {
  if (!timeString) return ''
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}
</script>

<style scoped>
.table-header {
  @apply px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider;
}

.table-cell {
  @apply px-4 py-3 text-sm;
}
</style>
