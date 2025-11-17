<script setup lang="ts">
import type { OrderWithDetails } from '~/types'

/**
 * Order list table component
 * Displays orders with sorting and actions
 */

interface Props {
  orders: OrderWithDetails[]
  loading?: boolean
  totalRecords?: number
  page?: number
  limit?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  totalRecords: 0,
  page: 1,
  limit: 20
})

const emit = defineEmits<{
  'view-order': [orderId: string]
  'sort': [sortBy: string, sortOrder: 'asc' | 'desc']
  'page-change': [page: number]
}>()

const router = useRouter()
const { formatCurrency, formatStatus, getStatusSeverity } = useTicketOrders()

// Pagination
const first = computed(() => (props.page - 1) * props.limit)

const onPage = (event: any) => {
  const newPage = Math.floor(event.first / props.limit) + 1
  emit('page-change', newPage)
}

// Sorting
const onSort = (event: any) => {
  const sortBy = event.sortField
  const sortOrder = event.sortOrder === 1 ? 'asc' : 'desc'
  emit('sort', sortBy, sortOrder)
}

// View order details
const viewOrder = (order: OrderWithDetails) => {
  router.push(`/admin/ticketing/orders/${order.id}`)
}

// Format date/time
const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const formatShowDateTime = (dateString: string, timeString: string) => {
  const date = new Date(dateString)
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
  return `${formattedDate} at ${timeString}`
}
</script>

<template>
  <div>
    <DataTable
      :value="orders"
      :loading="loading"
      :total-records="totalRecords"
      :rows="limit"
      :first="first"
      lazy
      paginator
      striped-rows
      responsive-layout="scroll"
      class="p-datatable-sm"
      @page="onPage"
      @sort="onSort"
    >
      <!-- Order Number -->
      <Column field="order_number" header="Order #" sortable class="font-mono">
        <template #body="{ data }">
          <button
            class="text-primary-600 hover:text-primary-700 font-semibold hover:underline"
            @click="viewOrder(data)"
          >
            {{ data.order_number }}
          </button>
        </template>
      </Column>

      <!-- Customer -->
      <Column field="customer_name" header="Customer" sortable>
        <template #body="{ data }">
          <div class="flex flex-col">
            <span class="font-medium text-gray-900">{{ data.customer_name }}</span>
            <span class="text-sm text-gray-500">{{ data.customer_email }}</span>
          </div>
        </template>
      </Column>

      <!-- Show -->
      <Column field="show.title" header="Show">
        <template #body="{ data }">
          <div v-if="data.show" class="flex flex-col">
            <span class="font-medium text-gray-900">{{ data.show.title }}</span>
            <span class="text-sm text-gray-500">
              {{ formatShowDateTime(data.show.show_date, data.show.show_time) }}
            </span>
          </div>
          <span v-else class="text-gray-400">N/A</span>
        </template>
      </Column>

      <!-- Seats -->
      <Column header="Seats">
        <template #body="{ data }">
          <div class="flex flex-col">
            <span class="font-medium text-gray-900">
              {{ data.ticket_count }} {{ data.ticket_count === 1 ? 'seat' : 'seats' }}
            </span>
            <span v-if="data.seat_numbers" class="text-xs text-gray-500 truncate max-w-xs" :title="data.seat_numbers">
              {{ data.seat_numbers }}
            </span>
          </div>
        </template>
      </Column>

      <!-- Total -->
      <Column field="total_amount_in_cents" header="Total" sortable>
        <template #body="{ data }">
          <span class="font-semibold text-gray-900">
            {{ formatCurrency(data.total_amount_in_cents) }}
          </span>
        </template>
      </Column>

      <!-- Status -->
      <Column field="status" header="Status" sortable>
        <template #body="{ data }">
          <Tag
            :value="formatStatus(data.status)"
            :severity="getStatusSeverity(data.status)"
          />
        </template>
      </Column>

      <!-- Order Date -->
      <Column field="created_at" header="Order Date" sortable>
        <template #body="{ data }">
          <span class="text-sm text-gray-600">
            {{ formatDateTime(data.created_at) }}
          </span>
        </template>
      </Column>

      <!-- Actions -->
      <Column header="Actions" class="text-center" style="width: 100px">
        <template #body="{ data }">
          <Button
            icon="pi pi-eye"
            text
            rounded
            severity="secondary"
            @click="viewOrder(data)"
            v-tooltip.top="'View Details'"
          />
        </template>
      </Column>

      <!-- Empty state -->
      <template #empty>
        <div class="text-center py-8 text-gray-500">
          <i class="pi pi-inbox text-4xl mb-3" />
          <p class="text-lg font-medium">No orders found</p>
          <p class="text-sm">Try adjusting your filters or search criteria</p>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
:deep(.p-datatable-table) {
  min-width: 1000px;
}
</style>
