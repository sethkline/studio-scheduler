<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="card bg-gradient-to-r from-green-500 to-blue-500 text-white">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">Payment History</h1>
          <p class="text-green-100 mt-1">Manage your family's dance expenses</p>
        </div>
        <i class="pi pi-dollar text-6xl opacity-20"></i>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="card bg-green-50 border-l-4 border-green-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Total Paid</p>
            <p class="text-2xl font-bold text-green-700">{{ formatCurrency(summary.total_paid) }}</p>
            <p v-if="summary.last_payment_date" class="text-xs text-gray-500 mt-1">
              Last: {{ formatDate(summary.last_payment_date) }}
            </p>
          </div>
          <i class="pi pi-check-circle text-3xl text-green-300"></i>
        </div>
      </div>

      <div class="card bg-yellow-50 border-l-4 border-yellow-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Pending</p>
            <p class="text-2xl font-bold text-yellow-700">{{ formatCurrency(summary.total_pending) }}</p>
          </div>
          <i class="pi pi-clock text-3xl text-yellow-300"></i>
        </div>
      </div>

      <div class="card bg-red-50 border-l-4 border-red-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Overdue</p>
            <p class="text-2xl font-bold text-red-700">{{ formatCurrency(summary.total_overdue) }}</p>
            <p v-if="summary.next_due_date" class="text-xs text-gray-500 mt-1">
              Due: {{ formatDate(summary.next_due_date) }}
            </p>
          </div>
          <i class="pi pi-exclamation-triangle text-3xl text-red-300"></i>
        </div>
      </div>

      <div class="card bg-blue-50 border-l-4 border-blue-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Total Due</p>
            <p class="text-2xl font-bold text-blue-700">{{ formatCurrency(summary.total_due) }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ summary.payment_count }} payments</p>
          </div>
          <i class="pi pi-money-bill text-3xl text-blue-300"></i>
        </div>
      </div>
    </div>

    <!-- Outstanding Balance Alert -->
    <Message v-if="summary.total_due > 0" severity="warn" :closable="false">
      <div class="flex items-center justify-between">
        <div>
          <strong>Outstanding Balance: {{ formatCurrency(summary.total_due) }}</strong>
          <p class="text-sm mt-1">You have pending or overdue payments.</p>
        </div>
        <Button label="Make Payment" icon="pi pi-credit-card" @click="makePayment" />
      </div>
    </Message>

    <!-- Payment Method on File -->
    <div v-if="paymentMethod" class="card">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold mb-2">Payment Method on File</h3>
          <div class="flex items-center space-x-3">
            <i class="pi pi-credit-card text-2xl text-gray-400"></i>
            <div>
              <p class="font-medium">
                {{ paymentMethod.card_brand }} ending in {{ paymentMethod.card_last4 }}
              </p>
              <p class="text-sm text-gray-600">
                Expires {{ paymentMethod.card_exp_month }}/{{ paymentMethod.card_exp_year }}
              </p>
            </div>
          </div>
        </div>
        <Button label="Update" icon="pi pi-pencil" class="p-button-outlined" size="small" @click="updatePaymentMethod" />
      </div>
    </div>

    <!-- Filters and Actions -->
    <div class="card">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div class="flex flex-wrap gap-3 flex-1">
          <!-- Student Filter -->
          <Dropdown
            v-model="filters.student_id"
            :options="studentOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All Students"
            class="w-48"
            showClear
            @change="loadPayments"
          />

          <!-- Payment Type Filter -->
          <Dropdown
            v-model="filters.payment_type"
            :options="paymentTypeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All Types"
            class="w-48"
            showClear
            @change="loadPayments"
          />

          <!-- Status Filter -->
          <Dropdown
            v-model="filters.status"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All Statuses"
            class="w-40"
            showClear
            @change="loadPayments"
          />

          <!-- Date Range -->
          <Calendar
            v-model="dateRange"
            selectionMode="range"
            :manualInput="false"
            dateFormat="mm/dd/yy"
            placeholder="Date Range"
            class="w-64"
            showIcon
            @date-select="onDateRangeChange"
          />
        </div>

        <div class="flex gap-2">
          <Button
            label="Export CSV"
            icon="pi pi-download"
            class="p-button-outlined"
            size="small"
            @click="exportToCSV"
            :loading="exporting"
          />
        </div>
      </div>
    </div>

    <!-- Payment History Table -->
    <div class="card">
      <h2 class="text-xl font-bold mb-4">Payment History</h2>

      <div v-if="loading" class="text-center py-8">
        <i class="pi pi-spin pi-spinner text-4xl text-primary-500"></i>
      </div>

      <div v-else-if="payments.length === 0" class="text-center py-12 bg-gray-50 rounded-lg">
        <i class="pi pi-inbox text-6xl text-gray-400 mb-4"></i>
        <p class="text-gray-600 text-lg">No payments found</p>
        <p class="text-gray-500 text-sm mt-2">
          {{ hasActiveFilters ? 'Try adjusting your filters' : 'Your payment history will appear here' }}
        </p>
      </div>

      <DataTable
        v-else
        :value="payments"
        :rows="10"
        :paginator="true"
        responsiveLayout="scroll"
        :rowHover="true"
        stripedRows
        sortField="created_at"
        :sortOrder="-1"
      >
        <Column field="created_at" header="Date" sortable :style="{ width: '120px' }">
          <template #body="{ data }">
            <div>
              <p class="font-medium">{{ formatDate(data.created_at) }}</p>
              <p class="text-xs text-gray-500">{{ formatTime(data.created_at) }}</p>
            </div>
          </template>
        </Column>

        <Column field="receipt_number" header="Receipt #" :style="{ width: '120px' }">
          <template #body="{ data }">
            <span class="font-mono text-sm">
              {{ data.receipt_number || data.id.substring(0, 8).toUpperCase() }}
            </span>
          </template>
        </Column>

        <Column field="student" header="Student" :style="{ width: '150px' }">
          <template #body="{ data }">
            <span v-if="data.student">
              {{ data.student.first_name }} {{ data.student.last_name }}
            </span>
            <span v-else class="text-gray-500 italic">Family</span>
          </template>
        </Column>

        <Column field="description" header="Description" sortable>
          <template #body="{ data }">
            <div>
              <p class="font-medium">{{ data.description }}</p>
              <p v-if="data.notes" class="text-xs text-gray-500 mt-1">{{ data.notes }}</p>
            </div>
          </template>
        </Column>

        <Column field="payment_type" header="Type" sortable :style="{ width: '120px' }">
          <template #body="{ data }">
            <Tag :value="formatPaymentType(data.payment_type)" :severity="getPaymentTypeSeverity(data.payment_type)" />
          </template>
        </Column>

        <Column field="amount_cents" header="Amount" sortable :style="{ width: '120px' }">
          <template #body="{ data }">
            <span class="font-semibold">{{ formatCurrency(data.amount_cents) }}</span>
          </template>
        </Column>

        <Column field="status" header="Status" sortable :style="{ width: '120px' }">
          <template #body="{ data }">
            <Tag :value="data.status.toUpperCase()" :severity="getStatusSeverity(data.status)" />
          </template>
        </Column>

        <Column field="due_date" header="Due/Paid Date" sortable :style="{ width: '140px' }">
          <template #body="{ data }">
            <div v-if="data.status === 'paid' && data.paid_at">
              <p class="text-sm text-green-600">Paid</p>
              <p class="text-xs text-gray-500">{{ formatDate(data.paid_at) }}</p>
            </div>
            <div v-else-if="data.due_date">
              <p class="text-sm text-gray-600">Due</p>
              <p class="text-xs" :class="isOverdue(data.due_date) ? 'text-red-600' : 'text-gray-500'">
                {{ formatDate(data.due_date) }}
              </p>
            </div>
            <span v-else class="text-gray-400 text-sm">-</span>
          </template>
        </Column>

        <Column header="Actions" :style="{ width: '120px' }">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button
                icon="pi pi-download"
                class="p-button-text p-button-sm"
                v-tooltip.top="'Download Receipt'"
                @click="downloadReceipt(data.id)"
              />
              <Button
                v-if="data.status === 'pending' || data.status === 'overdue'"
                icon="pi pi-credit-card"
                class="p-button-text p-button-sm p-button-success"
                v-tooltip.top="'Pay Now'"
                @click="payNow(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import type { PaymentWithRelations, PaymentSummary, PaymentFilters, PaymentMethodOnFile } from '~/types/payments'

definePageMeta({
  middleware: 'parent',
})

const toast = useToast()

// State
const loading = ref(true)
const exporting = ref(false)
const payments = ref<PaymentWithRelations[]>([])
const summary = ref<PaymentSummary>({
  total_paid: 0,
  total_pending: 0,
  total_overdue: 0,
  total_due: 0,
  payment_count: 0,
})
const paymentMethod = ref<PaymentMethodOnFile | null>(null)
const dateRange = ref<Date[] | null>(null)
const filters = ref<PaymentFilters>({})

// Students for filter dropdown
const students = ref<any[]>([])

// Computed
const studentOptions = computed(() => [
  { label: 'All Students', value: null },
  ...students.value.map(s => ({
    label: `${s.first_name} ${s.last_name}`,
    value: s.id,
  })),
])

const paymentTypeOptions = [
  { label: 'All Types', value: null },
  { label: 'Tuition', value: 'tuition' },
  { label: 'Recital Fee', value: 'recital_fee' },
  { label: 'Costume', value: 'costume' },
  { label: 'Registration', value: 'registration' },
  { label: 'Tickets', value: 'tickets' },
  { label: 'Late Fee', value: 'late_fee' },
  { label: 'Other', value: 'other' },
]

const statusOptions = [
  { label: 'All Statuses', value: null },
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'pending' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Failed', value: 'failed' },
  { label: 'Refunded', value: 'refunded' },
]

const hasActiveFilters = computed(() => {
  return !!(filters.value.student_id || filters.value.payment_type || filters.value.status || dateRange.value)
})

// Load data
onMounted(async () => {
  await loadStudents()
  await loadPayments()
  await loadPaymentMethod()
})

async function loadStudents() {
  try {
    const { data } = await useFetch('/api/parent/students')
    if (data.value) {
      students.value = data.value as any[]
    }
  } catch (error) {
    console.error('Error loading students:', error)
  }
}

async function loadPayments() {
  loading.value = true
  try {
    const params: any = {}

    if (filters.value.student_id) {
      params.student_id = filters.value.student_id
    }
    if (filters.value.payment_type) {
      params.payment_type = filters.value.payment_type
    }
    if (filters.value.status) {
      params.status = filters.value.status
    }
    if (dateRange.value && dateRange.value[0]) {
      params.start_date = dateRange.value[0].toISOString()
    }
    if (dateRange.value && dateRange.value[1]) {
      params.end_date = dateRange.value[1].toISOString()
    }

    const { data, error } = await useFetch('/api/parent/payments', { params })

    if (error.value) {
      throw error.value
    }

    if (data.value) {
      const response = data.value as any
      payments.value = response.payments || []
      summary.value = response.summary || {
        total_paid: 0,
        total_pending: 0,
        total_overdue: 0,
        total_due: 0,
        payment_count: 0,
      }
    }
  } catch (error) {
    console.error('Error loading payments:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load payment history',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

async function loadPaymentMethod() {
  try {
    const { data } = await useFetch('/api/parent/payment-methods')
    if (data.value && Array.isArray(data.value) && data.value.length > 0) {
      const methods = data.value as PaymentMethodOnFile[]
      paymentMethod.value = methods.find(m => m.is_default) || methods[0]
    }
  } catch (error) {
    console.error('Error loading payment method:', error)
  }
}

function onDateRangeChange() {
  loadPayments()
}

async function exportToCSV() {
  exporting.value = true
  try {
    const params: any = {}

    if (filters.value.student_id) {
      params.student_id = filters.value.student_id
    }
    if (filters.value.payment_type) {
      params.payment_type = filters.value.payment_type
    }
    if (filters.value.status) {
      params.status = filters.value.status
    }
    if (dateRange.value && dateRange.value[0]) {
      params.start_date = dateRange.value[0].toISOString()
    }
    if (dateRange.value && dateRange.value[1]) {
      params.end_date = dateRange.value[1].toISOString()
    }

    const queryString = new URLSearchParams(params).toString()
    const url = `/api/parent/payments/export${queryString ? '?' + queryString : ''}`

    // Trigger download
    window.open(url, '_blank')

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Payment history exported successfully',
      life: 3000,
    })
  } catch (error) {
    console.error('Error exporting payments:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to export payment history',
      life: 3000,
    })
  } finally {
    exporting.value = false
  }
}

async function downloadReceipt(paymentId: string) {
  try {
    window.open(`/api/parent/payments/${paymentId}/receipt`, '_blank')

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Receipt downloaded successfully',
      life: 3000,
    })
  } catch (error) {
    console.error('Error downloading receipt:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to download receipt',
      life: 3000,
    })
  }
}

function makePayment() {
  // TODO: Implement payment flow with Stripe
  toast.add({
    severity: 'info',
    summary: 'Coming Soon',
    detail: 'Payment integration will be available soon',
    life: 3000,
  })
}

function payNow(payment: PaymentWithRelations) {
  // TODO: Implement payment flow for specific payment
  toast.add({
    severity: 'info',
    summary: 'Coming Soon',
    detail: `Payment for ${payment.description} will be available soon`,
    life: 3000,
  })
}

function updatePaymentMethod() {
  // TODO: Implement payment method update flow
  toast.add({
    severity: 'info',
    summary: 'Coming Soon',
    detail: 'Update payment method feature coming soon',
    life: 3000,
  })
}

// Helpers
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatDate(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatPaymentType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getPaymentTypeSeverity(type: string): string {
  const severityMap: Record<string, string> = {
    tuition: 'info',
    recital_fee: 'secondary',
    costume: 'warning',
    registration: 'success',
    tickets: 'info',
    late_fee: 'danger',
    other: 'contrast',
  }
  return severityMap[type] || 'info'
}

function getStatusSeverity(status: string): string {
  const severityMap: Record<string, string> = {
    paid: 'success',
    pending: 'warning',
    overdue: 'danger',
    failed: 'danger',
    refunded: 'secondary',
  }
  return severityMap[status] || 'info'
}

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date()
}
</script>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow p-6;
}
</style>
