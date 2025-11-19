<script setup lang="ts">
import type { OrderWithDetails, OrderFilters } from '~/types'

/**
 * Admin Ticket Orders List Page
 * View and search all ticket orders
 */

definePageMeta({
  middleware: 'admin',
  layout: 'default'
})

const { listOrders } = useTicketOrders()
const toast = useToast()

// State
const orders = ref<OrderWithDetails[]>([])
const loading = ref(false)
const totalRecords = ref(0)
const totalPages = ref(0)

// Filters
const filters = ref<OrderFilters>({
  status: 'all',
  show_id: undefined,
  date_from: undefined,
  date_to: undefined,
  search: undefined,
  page: 1,
  limit: 20,
  sort_by: 'created_at',
  sort_order: 'desc'
})

// Shows for filter dropdown (fetch on mount)
const shows = ref<Array<{ id: string; title: string; show_date: string }>>([])

// Load orders
const loadOrders = async () => {
  loading.value = true
  try {
    const result = await listOrders(filters.value)

    if (result) {
      orders.value = result.data
      totalRecords.value = result.total
      totalPages.value = result.totalPages
    }
  } catch (error: any) {
    // Error toast is shown by composable
    console.error('Failed to load orders:', error)
  } finally {
    loading.value = false
  }
}

// Load shows for filter
const loadShows = async () => {
  try {
    const client = useSupabaseClient()
    const { data, error } = await client
      .from('recital_shows')
      .select('id, title, show_date')
      .order('show_date', { ascending: false })
      .limit(50)

    if (error) throw error

    shows.value = data || []
  } catch (error) {
    console.error('Failed to load shows:', error)
  }
}

// Handle filter apply
const handleFilterApply = () => {
  filters.value.page = 1 // Reset to first page
  loadOrders()
}

// Handle filter reset
const handleFilterReset = () => {
  loadOrders()
}

// Handle sort
const handleSort = (sortBy: string, sortOrder: 'asc' | 'desc') => {
  filters.value.sort_by = sortBy as any
  filters.value.sort_order = sortOrder
  loadOrders()
}

// Handle page change
const handlePageChange = (page: number) => {
  filters.value.page = page
  loadOrders()
}

// Initial load
onMounted(async () => {
  await Promise.all([loadShows(), loadOrders()])
})

// Meta tags
useHead({
  title: 'Ticket Orders - Admin'
})
</script>

<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <div class="flex justify-between items-start mb-2">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Ticket Orders</h1>
          <p class="text-gray-600 mt-1">
            View and manage all ticket orders
          </p>
        </div>
      </div>

      <!-- Summary Stats -->
      <div v-if="!loading && orders.length > 0" class="mt-4 flex items-center gap-2 text-sm text-gray-600">
        <i class="pi pi-info-circle" />
        <span>
          Showing {{ orders.length }} of {{ totalRecords.toLocaleString() }}
          {{ totalRecords === 1 ? 'order' : 'orders' }}
        </span>
      </div>
    </div>

    <!-- Filters -->
    <AdminTicketingOrderFilters
      v-model="filters"
      :shows="shows"
      :loading="loading"
      @apply="handleFilterApply"
      @reset="handleFilterReset"
    />

    <!-- Orders Table -->
    <Card>
      <template #content>
        <AdminTicketingOrderList
          :orders="orders"
          :loading="loading"
          :total-records="totalRecords"
          :page="filters.page || 1"
          :limit="filters.limit || 20"
          @sort="handleSort"
          @page-change="handlePageChange"
        />
      </template>
    </Card>
  </div>
</template>
