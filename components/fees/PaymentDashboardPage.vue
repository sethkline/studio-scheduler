<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <!-- Page header -->
    <div class="mb-6">
      <h1 :class="typography.heading.h1">Payment Dashboard</h1>
      <p :class="typography.body.small" class="mt-1">
        Track all payments for {{ recitalShow?.name || 'this recital' }}
      </p>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <AppCard>
        <div class="text-center">
          <p :class="typography.body.small" class="text-gray-500">Total Expected</p>
          <p :class="typography.heading.h2" class="mt-1">
            {{ formatCurrency(summary.total_expected) }}
          </p>
        </div>
      </AppCard>

      <AppCard>
        <div class="text-center">
          <p :class="typography.body.small" class="text-gray-500">Total Collected</p>
          <p :class="typography.heading.h2" class="mt-1 text-green-600">
            {{ formatCurrency(summary.total_collected) }}
          </p>
        </div>
      </AppCard>

      <AppCard>
        <div class="text-center">
          <p :class="typography.body.small" class="text-gray-500">Outstanding</p>
          <p :class="typography.heading.h2" class="mt-1 text-orange-600">
            {{ formatCurrency(summary.total_outstanding) }}
          </p>
        </div>
      </AppCard>

      <AppCard>
        <div class="text-center">
          <p :class="typography.body.small" class="text-gray-500">Collection Rate</p>
          <p :class="typography.heading.h2" class="mt-1">
            {{ summary.collection_rate }}%
          </p>
        </div>
      </AppCard>

      <AppCard>
        <div class="text-center">
          <p :class="typography.body.small" class="text-gray-500">Students Owing</p>
          <p :class="typography.heading.h2" class="mt-1 text-red-600">
            {{ summary.students_with_balance }}
          </p>
        </div>
      </AppCard>
    </div>

    <!-- Filters -->
    <AppCard class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Payment status filter -->
        <div>
          <label :class="inputs.label">Payment Status</label>
          <select
            v-model="filters.status"
            :class="getInputClasses()"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid in Full</option>
            <option value="overdue">Overdue</option>
            <option value="waived">Waived</option>
          </select>
        </div>

        <!-- Fee type filter -->
        <div>
          <label :class="inputs.label">Fee Type</label>
          <select
            v-model="filters.feeType"
            :class="getInputClasses()"
          >
            <option value="">All Types</option>
            <option value="participation">Participation</option>
            <option value="costume">Costume</option>
            <option value="makeup">Makeup</option>
            <option value="other">Other</option>
          </select>
        </div>

        <!-- Search -->
        <div>
          <AppInput
            v-model="filters.search"
            label="Search Student"
            placeholder="Student name..."
          >
            <template #iconLeft>
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </template>
          </AppInput>
        </div>

        <!-- Actions -->
        <div class="flex items-end">
          <AppButton
            size="sm"
            variant="secondary"
            full-width
            @click="applyFilters"
          >
            Apply Filters
          </AppButton>
        </div>
      </div>
    </AppCard>

    <!-- Loading state -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="animate-pulse">
        <AppCard>
          <div class="h-6 bg-gray-200 rounded w-1/3 mb-2" />
          <div class="h-4 bg-gray-200 rounded w-full" />
        </AppCard>
      </div>
    </div>

    <!-- Empty state -->
    <AppEmptyState
      v-else-if="!loading && studentFees.length === 0"
      heading="No fee assignments yet"
      description="Assign fees to students to start tracking payments"
    >
      <template #icon>
        <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </template>
      <template #action>
        <AppButton
          variant="primary"
          @click="router.push(`/recitals/${recitalShowId}/fees/assign`)"
        >
          Assign Fees
        </AppButton>
      </template>
    </AppEmptyState>

    <!-- Student fees table -->
    <AppCard v-else no-padding>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fee Type
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Amount
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paid
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="fee in studentFees"
              :key="fee.id"
              class="hover:bg-gray-50"
            >
              <!-- Student name -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ fee.student?.first_name }} {{ fee.student?.last_name }}
                </div>
              </td>

              <!-- Fee type -->
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getFeeTypeColor(fee.fee_type?.fee_type)
                  ]"
                >
                  {{ fee.fee_type?.name }}
                </span>
              </td>

              <!-- Total amount -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatCurrency(fee.total_amount_in_cents) }}
              </td>

              <!-- Paid amount -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                {{ formatCurrency(fee.amount_paid_in_cents) }}
              </td>

              <!-- Balance -->
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <span :class="fee.balance_in_cents > 0 ? 'text-orange-600' : 'text-gray-400'">
                  {{ formatCurrency(fee.balance_in_cents) }}
                </span>
              </td>

              <!-- Status -->
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getStatusColor(fee.status)
                  ]"
                >
                  {{ fee.status }}
                </span>
              </td>

              <!-- Due date -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {{ fee.due_date ? formatDate(fee.due_date) : '—' }}
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <AppButton
                  size="sm"
                  variant="ghost"
                  @click="recordPayment(fee.id)"
                >
                  Record Payment
                </AppButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>

    <!-- Record Payment Modal -->
    <RecordPaymentModal
      v-model="showPaymentModal"
      :student-fee-id="selectedFeeId"
      @recorded="handlePaymentRecorded"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { typography, inputs, getInputClasses } from '~/lib/design-system'
import type { StudentFeeWithDetails } from '~/types/tier1-features'

const route = useRoute()
const router = useRouter()

// Props
const recitalShowId = computed(() => route.params.id as string)

// State
const loading = ref(false)
const studentFees = ref<StudentFeeWithDetails[]>([])
const recitalShow = ref<any>(null)
const showPaymentModal = ref(false)
const selectedFeeId = ref<string | null>(null)

// Summary
const summary = ref({
  total_expected: 0,
  total_collected: 0,
  total_outstanding: 0,
  collection_rate: 0,
  students_with_balance: 0,
})

// Filters
const filters = ref({
  status: '',
  feeType: '',
  search: '',
})

/**
 * Fetch student fees and summary
 */
async function fetchPayments() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.value.status) params.append('status', filters.value.status)
    if (filters.value.feeType) params.append('fee_type', filters.value.feeType)
    if (filters.value.search) params.append('search', filters.value.search)

    const { data, error } = await useFetch(
      `/api/recitals/${recitalShowId.value}/student-fees?${params}`
    )

    if (error.value) {
      throw new Error(error.value.message)
    }

    studentFees.value = data.value?.fees || []
    summary.value = data.value?.summary || summary.value
  } catch (error) {
    console.error('Failed to fetch payments:', error)
  } finally {
    loading.value = false
  }
}

/**
 * Apply filters
 */
function applyFilters() {
  fetchPayments()
}

/**
 * Record payment
 */
function recordPayment(feeId: string) {
  selectedFeeId.value = feeId
  showPaymentModal.value = true
}

/**
 * Handle payment recorded
 */
function handlePaymentRecorded() {
  showPaymentModal.value = false
  fetchPayments()
}

/**
 * Get fee type color
 */
function getFeeTypeColor(type: string): string {
  const colors: Record<string, string> = {
    participation: 'bg-blue-100 text-blue-800',
    costume: 'bg-purple-100 text-purple-800',
    makeup: 'bg-pink-100 text-pink-800',
    other: 'bg-gray-100 text-gray-800',
  }
  return colors[type] || colors.other
}

/**
 * Get status color
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    partial: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    waived: 'bg-blue-100 text-blue-800',
    overdue: 'bg-red-100 text-red-800',
  }
  return colors[status] || colors.pending
}

/**
 * Format currency
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

/**
 * Format date
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Load data on mount
onMounted(() => {
  fetchPayments()
})
</script>
