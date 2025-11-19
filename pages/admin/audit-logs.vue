<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Audit Logs</h1>
      <p class="text-gray-600 dark:text-gray-400">
        View system activity and sensitive operations
      </p>
    </div>

    <!-- Filters -->
    <Card class="mb-6">
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Action Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Action
            </label>
            <Select
              v-model="filters.action"
              :options="actionOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Actions"
              class="w-full"
              @change="fetchLogs"
            />
          </div>

          <!-- Resource Type Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Resource Type
            </label>
            <Select
              v-model="filters.resource_type"
              :options="resourceTypeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Types"
              class="w-full"
              @change="fetchLogs"
            />
          </div>

          <!-- Date Range -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Range
            </label>
            <DatePicker
              v-model="dateRange"
              selectionMode="range"
              placeholder="Select date range"
              class="w-full"
              @date-select="fetchLogs"
            />
          </div>
        </div>

        <!-- Clear Filters -->
        <div class="mt-4 flex justify-end">
          <Button
            label="Clear Filters"
            severity="secondary"
            size="small"
            @click="clearFilters"
          />
        </div>
      </template>
    </Card>

    <!-- Audit Logs Table -->
    <Card>
      <template #content>
        <DataTable
          :value="logs"
          :loading="loading"
          :rows="pageSize"
          :totalRecords="totalRecords"
          lazy
          paginator
          @page="onPage"
          stripedRows
          class="p-datatable-sm"
        >
          <Column field="created_at" header="Timestamp" sortable>
            <template #body="{ data }">
              <div class="text-sm">
                {{ formatDate(data.created_at) }}
              </div>
            </template>
          </Column>

          <Column field="action" header="Action" sortable>
            <template #body="{ data }">
              <Tag :severity="getActionSeverity(data.action)" :value="data.action" />
            </template>
          </Column>

          <Column field="user_name" header="User" sortable>
            <template #body="{ data }">
              <div class="text-sm">
                <div class="font-medium">{{ data.user_name || 'Unknown' }}</div>
                <div class="text-gray-500">{{ data.user_email }}</div>
              </div>
            </template>
          </Column>

          <Column field="resource_type" header="Resource" sortable>
            <template #body="{ data }">
              <div class="text-sm">
                <div>{{ data.resource_type }}</div>
                <div v-if="data.resource_id" class="text-gray-500 text-xs font-mono">
                  {{ data.resource_id.substring(0, 8) }}...
                </div>
              </div>
            </template>
          </Column>

          <Column field="status" header="Status" sortable>
            <template #body="{ data }">
              <Tag
                :severity="data.status === 'success' ? 'success' : 'danger'"
                :value="data.status"
              />
            </template>
          </Column>

          <Column field="ip_address" header="IP Address">
            <template #body="{ data }">
              <div class="text-sm font-mono">{{ data.ip_address || '-' }}</div>
            </template>
          </Column>

          <Column header="Details">
            <template #body="{ data }">
              <Button
                icon="pi pi-eye"
                size="small"
                text
                @click="viewDetails(data)"
              />
            </template>
          </Column>

          <template #empty>
            <div class="text-center py-8 text-gray-500">
              No audit logs found
            </div>
          </template>
        </DataTable>
      </template>
    </Card>

    <!-- Details Dialog -->
    <Dialog
      v-model:visible="showDetailsDialog"
      header="Audit Log Details"
      :modal="true"
      :style="{ width: '50vw' }"
    >
      <div v-if="selectedLog" class="space-y-4">
        <div>
          <h3 class="font-semibold text-sm text-gray-700 dark:text-gray-300">Action</h3>
          <p class="mt-1">{{ selectedLog.action }}</p>
        </div>

        <div>
          <h3 class="font-semibold text-sm text-gray-700 dark:text-gray-300">User</h3>
          <p class="mt-1">{{ selectedLog.user_name }} ({{ selectedLog.user_email }})</p>
          <p class="text-sm text-gray-500">Role: {{ selectedLog.user_role }}</p>
        </div>

        <div>
          <h3 class="font-semibold text-sm text-gray-700 dark:text-gray-300">Resource</h3>
          <p class="mt-1">Type: {{ selectedLog.resource_type }}</p>
          <p v-if="selectedLog.resource_id" class="text-sm font-mono text-gray-500">
            ID: {{ selectedLog.resource_id }}
          </p>
        </div>

        <div>
          <h3 class="font-semibold text-sm text-gray-700 dark:text-gray-300">Metadata</h3>
          <pre class="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-64">{{
            JSON.stringify(selectedLog.metadata, null, 2)
          }}</pre>
        </div>

        <div>
          <h3 class="font-semibold text-sm text-gray-700 dark:text-gray-300">Request Info</h3>
          <p class="text-sm">IP: {{ selectedLog.ip_address }}</p>
          <p class="text-sm">Request ID: {{ selectedLog.request_id }}</p>
          <p class="text-sm">User Agent: {{ selectedLog.user_agent }}</p>
        </div>

        <div v-if="selectedLog.error_message">
          <h3 class="font-semibold text-sm text-red-700 dark:text-red-400">Error</h3>
          <p class="mt-1 text-sm text-red-600">{{ selectedLog.error_message }}</p>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'admin', // Require admin role
  layout: 'default',
})

// State
const logs = ref<any[]>([])
const loading = ref(false)
const totalRecords = ref(0)
const pageSize = ref(50)
const currentPage = ref(0)
const showDetailsDialog = ref(false)
const selectedLog = ref<any>(null)
const dateRange = ref<Date[] | null>(null)

// Filters
const filters = ref({
  action: null,
  resource_type: null,
})

// Filter options
const actionOptions = ref([
  { label: 'All Actions', value: null },
  { label: 'Order Refund', value: 'order.refund' },
  { label: 'Order Cancel', value: 'order.cancel' },
  { label: 'User Role Change', value: 'user.role_change' },
  { label: 'Ticket Resend', value: 'ticket.resend' },
  { label: 'Seat Override', value: 'seat.override' },
])

const resourceTypeOptions = ref([
  { label: 'All Types', value: null },
  { label: 'Order', value: 'order' },
  { label: 'Ticket', value: 'ticket' },
  { label: 'User', value: 'user' },
  { label: 'Seat', value: 'seat' },
  { label: 'Payment', value: 'payment' },
])

// Fetch logs
const fetchLogs = async () => {
  loading.value = true

  try {
    const params: any = {
      limit: pageSize.value,
      offset: currentPage.value * pageSize.value,
    }

    if (filters.value.action) {
      params.action = filters.value.action
    }

    if (filters.value.resource_type) {
      params.resource_type = filters.value.resource_type
    }

    if (dateRange.value && dateRange.value.length === 2) {
      params.from_date = dateRange.value[0].toISOString()
      params.to_date = dateRange.value[1].toISOString()
    }

    const response = await $fetch('/api/admin/audit-logs', { params })

    if (response.success) {
      logs.value = response.data
      totalRecords.value = response.pagination.total
    }
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    useToast().add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to fetch audit logs',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

// Pagination handler
const onPage = (event: any) => {
  currentPage.value = event.page
  fetchLogs()
}

// Clear filters
const clearFilters = () => {
  filters.value.action = null
  filters.value.resource_type = null
  dateRange.value = null
  currentPage.value = 0
  fetchLogs()
}

// View details
const viewDetails = (log: any) => {
  selectedLog.value = log
  showDetailsDialog.value = true
}

// Format date
const formatDate = (date: string) => {
  return new Date(date).toLocaleString()
}

// Get action severity
const getActionSeverity = (action: string) => {
  if (action.includes('refund') || action.includes('cancel') || action.includes('delete')) {
    return 'danger'
  }
  if (action.includes('change') || action.includes('override')) {
    return 'warning'
  }
  return 'info'
}

// Load logs on mount
onMounted(() => {
  fetchLogs()
})
</script>
