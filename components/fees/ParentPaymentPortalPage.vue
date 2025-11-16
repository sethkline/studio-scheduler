<template>
  <div class="max-w-5xl mx-auto px-4 py-6">
    <!-- Page header -->
    <div class="mb-6">
      <h1 :class="typography.heading.h1">Recital Fees & Payments</h1>
      <p :class="typography.body.small" class="mt-1">
        View and pay fees for {{ recitalShow?.name || 'this recital' }}
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="animate-pulse">
        <AppCard>
          <div class="h-6 bg-gray-200 rounded w-1/3 mb-2" />
          <div class="h-4 bg-gray-200 rounded w-full" />
        </AppCard>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Summary Card -->
      <AppCard>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center md:text-left">
            <p :class="typography.body.small" class="text-gray-500">Total Amount Due</p>
            <p :class="typography.heading.h2" class="mt-1 text-orange-600">
              {{ formatCurrency(summary.total_due) }}
            </p>
          </div>
          <div class="text-center md:text-left">
            <p :class="typography.body.small" class="text-gray-500">Amount Paid</p>
            <p :class="typography.heading.h2" class="mt-1 text-green-600">
              {{ formatCurrency(summary.total_paid) }}
            </p>
          </div>
          <div class="text-center md:text-left">
            <p :class="typography.body.small" class="text-gray-500">Remaining Balance</p>
            <p :class="typography.heading.h2" class="mt-1">
              {{ formatCurrency(summary.total_balance) }}
            </p>
          </div>
        </div>

        <!-- Pay All Button -->
        <div v-if="summary.total_balance > 0" class="mt-6 pt-6 border-t border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <p :class="typography.body.base" class="font-medium">Ready to pay?</p>
              <p :class="typography.body.small" class="text-gray-500">
                Pay your full balance securely with Stripe
              </p>
            </div>
            <AppButton
              variant="primary"
              size="lg"
              @click="payAllFees"
            >
              <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Pay {{ formatCurrency(summary.total_balance) }} Now
            </AppButton>
          </div>
        </div>

        <!-- Paid in Full Message -->
        <div v-else class="mt-6 pt-6 border-t border-gray-200">
          <div class="flex items-center gap-3 text-green-700 bg-green-50 rounded-lg p-4">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p :class="typography.body.base" class="font-medium">All fees paid!</p>
              <p :class="typography.body.small">You're all set for the recital.</p>
            </div>
          </div>
        </div>
      </AppCard>

      <!-- Student Fees by Child -->
      <div v-for="child in childrenWithFees" :key="child.student_id" class="space-y-3">
        <h2 :class="typography.heading.h3">
          {{ child.student_name }}
        </h2>

        <!-- Fees for this child -->
        <div class="space-y-3">
          <AppCard v-for="fee in child.fees" :key="fee.id">
            <div class="flex items-start justify-between">
              <!-- Fee Details -->
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <h3 :class="typography.body.base" class="font-medium">
                    {{ fee.fee_type?.name }}
                  </h3>
                  <span
                    :class="[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      getStatusColor(fee.status)
                    ]"
                  >
                    {{ fee.status }}
                  </span>
                </div>

                <p v-if="fee.fee_type?.description" :class="typography.body.small" class="text-gray-600 mb-3">
                  {{ fee.fee_type.description }}
                </p>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p :class="typography.body.small" class="text-gray-500">Total Amount</p>
                    <p :class="typography.body.base" class="font-medium">
                      {{ formatCurrency(fee.total_amount_in_cents) }}
                    </p>
                  </div>
                  <div>
                    <p :class="typography.body.small" class="text-gray-500">Paid</p>
                    <p :class="typography.body.base" class="font-medium text-green-600">
                      {{ formatCurrency(fee.amount_paid_in_cents) }}
                    </p>
                  </div>
                  <div>
                    <p :class="typography.body.small" class="text-gray-500">Balance</p>
                    <p :class="typography.body.base" class="font-medium text-orange-600">
                      {{ formatCurrency(fee.balance_in_cents) }}
                    </p>
                  </div>
                  <div>
                    <p :class="typography.body.small" class="text-gray-500">Due Date</p>
                    <p :class="typography.body.base" class="font-medium">
                      {{ fee.due_date ? formatDate(fee.due_date) : '—' }}
                    </p>
                  </div>
                </div>

                <!-- Payment Plan -->
                <div v-if="fee.payment_plan" class="mt-4 pt-4 border-t border-gray-200">
                  <div class="flex items-center gap-2 mb-2">
                    <svg class="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p :class="typography.body.small" class="font-medium text-blue-900">
                      Payment Plan: {{ fee.payment_plan.number_of_installments }} installments of {{ formatCurrency(fee.payment_plan.installment_amount_in_cents) }}
                    </p>
                  </div>
                  <p :class="typography.body.small" class="text-gray-600">
                    Next payment due: {{ formatDate(fee.payment_plan.next_payment_date) }}
                  </p>
                </div>

                <!-- Early Bird / Late Fee Notices -->
                <div v-if="showEarlyBirdNotice(fee)" class="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                  <div class="flex items-start gap-2">
                    <svg class="h-4 w-4 text-green-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p :class="typography.body.small" class="font-medium text-green-900">Early Bird Discount Available!</p>
                      <p :class="typography.body.small" class="text-green-700">
                        Pay by {{ formatDate(fee.fee_type.early_bird_deadline) }} and save {{ formatCurrency((fee.total_amount_in_cents - fee.fee_type.early_bird_amount_in_cents)) }}
                      </p>
                    </div>
                  </div>
                </div>

                <div v-if="showLateFeeNotice(fee)" class="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div class="flex items-start gap-2">
                    <svg class="h-4 w-4 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p :class="typography.body.small" class="font-medium text-red-900">Late Fee Applied</p>
                      <p :class="typography.body.small" class="text-red-700">
                        This fee is overdue. A late fee of {{ formatCurrency(fee.fee_type.late_fee_amount_in_cents) }} has been added.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div v-if="fee.balance_in_cents > 0" class="ml-4">
                <AppButton
                  variant="primary"
                  size="sm"
                  @click="payIndividualFee(fee.id)"
                >
                  Pay Now
                </AppButton>
              </div>
            </div>

            <!-- Payment History -->
            <div v-if="fee.payments && fee.payments.length > 0" class="mt-4 pt-4 border-t border-gray-200">
              <p :class="typography.body.small" class="font-medium text-gray-700 mb-2">Payment History</p>
              <div class="space-y-2">
                <div
                  v-for="payment in fee.payments"
                  :key="payment.id"
                  class="flex items-center justify-between text-sm"
                >
                  <div class="flex items-center gap-2">
                    <svg class="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{{ formatDate(payment.payment_date) }}</span>
                    <span class="text-gray-400">•</span>
                    <span class="text-gray-600">{{ payment.payment_method }}</span>
                  </div>
                  <span class="font-medium text-green-600">
                    {{ formatCurrency(payment.amount_in_cents) }}
                  </span>
                </div>
              </div>
            </div>
          </AppCard>
        </div>
      </div>

      <!-- Empty State -->
      <AppEmptyState
        v-if="childrenWithFees.length === 0"
        heading="No fees assigned yet"
        description="You don't have any recital fees at this time. Check back later or contact the studio if you have questions."
      >
        <template #icon>
          <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </template>
      </AppEmptyState>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { typography } from '~/lib/design-system'

const route = useRoute()

// Props
const recitalShowId = computed(() => route.params.id as string)

// State
const loading = ref(false)
const recitalShow = ref<any>(null)
const childrenWithFees = ref<any[]>([])

// Summary
const summary = computed(() => {
  let total_due = 0
  let total_paid = 0

  childrenWithFees.value.forEach(child => {
    child.fees.forEach((fee: any) => {
      total_due += fee.total_amount_in_cents
      total_paid += fee.amount_paid_in_cents
    })
  })

  return {
    total_due,
    total_paid,
    total_balance: total_due - total_paid,
  }
})

/**
 * Fetch fees for parent's children
 */
async function fetchFees() {
  loading.value = true
  try {
    const { data, error } = await useFetch(
      `/api/recitals/${recitalShowId.value}/parent-fees`
    )

    if (error.value) {
      throw new Error(error.value.message)
    }

    childrenWithFees.value = data.value?.children || []
    recitalShow.value = data.value?.recital
  } catch (error) {
    console.error('Failed to fetch fees:', error)
  } finally {
    loading.value = false
  }
}

/**
 * Pay all outstanding fees
 */
async function payAllFees() {
  // Collect all unpaid fee IDs
  const feeIds: string[] = []
  childrenWithFees.value.forEach(child => {
    child.fees.forEach((fee: any) => {
      if (fee.balance_in_cents > 0) {
        feeIds.push(fee.id)
      }
    })
  })

  if (feeIds.length === 0) return

  try {
    // Create Stripe checkout session for multiple fees
    const { data, error } = await useFetch('/api/payments/create-checkout-session', {
      method: 'POST',
      body: {
        fee_ids: feeIds,
        success_url: window.location.href + '?payment=success',
        cancel_url: window.location.href + '?payment=cancelled',
      },
    })

    if (error.value) {
      throw new Error(error.value.message)
    }

    // Redirect to Stripe checkout
    if (data.value?.url) {
      window.location.href = data.value.url
    }
  } catch (error) {
    console.error('Failed to create checkout session:', error)
  }
}

/**
 * Pay individual fee
 */
async function payIndividualFee(feeId: string) {
  try {
    // Create Stripe checkout session for single fee
    const { data, error } = await useFetch('/api/payments/create-checkout-session', {
      method: 'POST',
      body: {
        fee_ids: [feeId],
        success_url: window.location.href + '?payment=success',
        cancel_url: window.location.href + '?payment=cancelled',
      },
    })

    if (error.value) {
      throw new Error(error.value.message)
    }

    // Redirect to Stripe checkout
    if (data.value?.url) {
      window.location.href = data.value.url
    }
  } catch (error) {
    console.error('Failed to create checkout session:', error)
  }
}

/**
 * Show early bird notice
 */
function showEarlyBirdNotice(fee: any): boolean {
  if (!fee.fee_type?.early_bird_deadline || !fee.fee_type?.early_bird_amount_in_cents) {
    return false
  }

  const today = new Date()
  const deadline = new Date(fee.fee_type.early_bird_deadline)

  // Show if deadline hasn't passed and fee isn't fully paid
  return deadline > today && fee.balance_in_cents > 0
}

/**
 * Show late fee notice
 */
function showLateFeeNotice(fee: any): boolean {
  if (!fee.due_date || !fee.fee_type?.late_fee_amount_in_cents) {
    return false
  }

  const today = new Date()
  const dueDate = new Date(fee.due_date)

  // Show if due date has passed and fee isn't fully paid
  return dueDate < today && fee.balance_in_cents > 0 && fee.status === 'overdue'
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
  fetchFees()
})
</script>
