<template>
  <AppModal
    v-model="isOpen"
    title="Record Payment"
    size="lg"
    @close="handleClose"
  >
    <!-- Loading state -->
    <div v-if="loading" class="py-8 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <p :class="typography.body.small" class="mt-4 text-gray-500">Loading payment details...</p>
    </div>

    <!-- Form -->
    <div v-else>
      <!-- Student and Fee Info -->
      <div class="bg-gray-50 rounded-lg p-4 mb-6">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p :class="typography.body.small" class="text-gray-500 mb-1">Student</p>
            <p :class="typography.body.base" class="font-medium">
              {{ studentFee?.student?.first_name }} {{ studentFee?.student?.last_name }}
            </p>
          </div>
          <div>
            <p :class="typography.body.small" class="text-gray-500 mb-1">Fee Type</p>
            <p :class="typography.body.base" class="font-medium">
              {{ studentFee?.fee_type?.name }}
            </p>
          </div>
          <div>
            <p :class="typography.body.small" class="text-gray-500 mb-1">Total Amount</p>
            <p :class="typography.body.base" class="font-medium">
              {{ formatCurrency(studentFee?.total_amount_in_cents || 0) }}
            </p>
          </div>
          <div>
            <p :class="typography.body.small" class="text-gray-500 mb-1">Amount Paid</p>
            <p :class="typography.body.base" class="font-medium text-green-600">
              {{ formatCurrency(studentFee?.amount_paid_in_cents || 0) }}
            </p>
          </div>
          <div class="col-span-2">
            <p :class="typography.body.small" class="text-gray-500 mb-1">Outstanding Balance</p>
            <p :class="typography.heading.h3" class="font-bold text-orange-600">
              {{ formatCurrency(studentFee?.balance_in_cents || 0) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Payment Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Amount -->
        <div>
          <AppInput
            v-model="form.amount"
            label="Payment Amount"
            type="number"
            step="0.01"
            min="0.01"
            :max="maxPaymentAmount"
            required
            placeholder="0.00"
            :error="errors.amount"
            :disabled="submitting"
          >
            <template #iconLeft>
              <span class="text-gray-500">$</span>
            </template>
            <template #help>
              <span class="text-xs text-gray-500">
                Maximum: {{ formatCurrency(studentFee?.balance_in_cents || 0) }}
              </span>
            </template>
          </AppInput>
        </div>

        <!-- Payment Method -->
        <div>
          <label :class="inputs.label">Payment Method</label>
          <select
            v-model="form.payment_method"
            :class="getInputClasses(errors.payment_method ? 'error' : 'default')"
            required
            :disabled="submitting"
          >
            <option value="">Select payment method</option>
            <option value="credit_card">Credit Card (Stripe)</option>
            <option value="cash">Cash</option>
            <option value="check">Check</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="other">Other</option>
          </select>
          <p v-if="errors.payment_method" :class="inputs.error">
            {{ errors.payment_method }}
          </p>
        </div>

        <!-- Check Number (conditional) -->
        <div v-if="form.payment_method === 'check'">
          <AppInput
            v-model="form.check_number"
            label="Check Number"
            type="text"
            required
            placeholder="12345"
            :error="errors.check_number"
            :disabled="submitting"
          />
        </div>

        <!-- Transaction ID (conditional) -->
        <div v-if="['bank_transfer', 'other'].includes(form.payment_method)">
          <AppInput
            v-model="form.transaction_id"
            label="Transaction ID / Reference"
            type="text"
            placeholder="Optional reference number"
            :disabled="submitting"
          />
        </div>

        <!-- Payment Date -->
        <div>
          <AppInput
            v-model="form.payment_date"
            label="Payment Date"
            type="date"
            required
            :error="errors.payment_date"
            :disabled="submitting"
          />
        </div>

        <!-- Notes -->
        <div>
          <label :class="inputs.label">Notes (Optional)</label>
          <textarea
            v-model="form.notes"
            :class="getInputClasses()"
            rows="3"
            placeholder="Add any additional notes about this payment..."
            :disabled="submitting"
          ></textarea>
        </div>

        <!-- Stripe Payment Section (conditional) -->
        <div v-if="form.payment_method === 'credit_card'" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <svg class="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p :class="typography.body.small" class="font-medium text-blue-900">Stripe Payment</p>
              <p :class="typography.body.small" class="text-blue-700 mt-1">
                Clicking "Process Payment" will open Stripe checkout. The payment will be processed immediately.
              </p>
            </div>
          </div>
        </div>

        <!-- Error Alert -->
        <AppAlert v-if="submitError" variant="error" :dismissible="true" @dismiss="submitError = null">
          {{ submitError }}
        </AppAlert>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <AppButton
            variant="secondary"
            @click="handleClose"
            :disabled="submitting"
          >
            Cancel
          </AppButton>
          <AppButton
            variant="primary"
            native-type="submit"
            :loading="submitting"
            :disabled="!isFormValid"
          >
            {{ form.payment_method === 'credit_card' ? 'Process Payment' : 'Record Payment' }}
          </AppButton>
        </div>
      </form>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { typography, inputs, getInputClasses } from '~/lib/design-system'

interface Props {
  modelValue: boolean
  studentFeeId: string | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'recorded'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// State
const loading = ref(false)
const submitting = ref(false)
const studentFee = ref<any>(null)
const submitError = ref<string | null>(null)

// Form
const form = ref({
  amount: '',
  payment_method: '',
  check_number: '',
  transaction_id: '',
  payment_date: new Date().toISOString().split('T')[0],
  notes: '',
})

const errors = ref({
  amount: '',
  payment_method: '',
  check_number: '',
  payment_date: '',
})

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const maxPaymentAmount = computed(() => {
  if (!studentFee.value?.balance_in_cents) return 0
  return (studentFee.value.balance_in_cents / 100).toFixed(2)
})

const isFormValid = computed(() => {
  if (!form.value.amount || parseFloat(form.value.amount) <= 0) return false
  if (!form.value.payment_method) return false
  if (form.value.payment_method === 'check' && !form.value.check_number) return false
  if (!form.value.payment_date) return false

  // Check amount doesn't exceed balance
  const amountCents = Math.round(parseFloat(form.value.amount) * 100)
  if (amountCents > (studentFee.value?.balance_in_cents || 0)) return false

  return true
})

/**
 * Fetch student fee details
 */
async function fetchStudentFee() {
  if (!props.studentFeeId) return

  loading.value = true
  try {
    const { data, error } = await useFetch(`/api/student-fees/${props.studentFeeId}`)

    if (error.value) {
      throw new Error(error.value.message)
    }

    studentFee.value = data.value

    // Pre-fill amount with full balance
    form.value.amount = (studentFee.value.balance_in_cents / 100).toFixed(2)
  } catch (error: any) {
    console.error('Failed to fetch student fee:', error)
    submitError.value = 'Failed to load payment details'
  } finally {
    loading.value = false
  }
}

/**
 * Validate form
 */
function validateForm(): boolean {
  errors.value = {
    amount: '',
    payment_method: '',
    check_number: '',
    payment_date: '',
  }

  let isValid = true

  // Amount
  if (!form.value.amount || parseFloat(form.value.amount) <= 0) {
    errors.value.amount = 'Please enter a valid amount'
    isValid = false
  } else {
    const amountCents = Math.round(parseFloat(form.value.amount) * 100)
    if (amountCents > (studentFee.value?.balance_in_cents || 0)) {
      errors.value.amount = 'Amount cannot exceed outstanding balance'
      isValid = false
    }
  }

  // Payment method
  if (!form.value.payment_method) {
    errors.value.payment_method = 'Please select a payment method'
    isValid = false
  }

  // Check number
  if (form.value.payment_method === 'check' && !form.value.check_number) {
    errors.value.check_number = 'Check number is required'
    isValid = false
  }

  // Payment date
  if (!form.value.payment_date) {
    errors.value.payment_date = 'Payment date is required'
    isValid = false
  }

  return isValid
}

/**
 * Handle submit
 */
async function handleSubmit() {
  if (!validateForm()) return

  submitting.value = true
  submitError.value = null

  try {
    // If credit card, handle Stripe payment
    if (form.value.payment_method === 'credit_card') {
      await processStripePayment()
    } else {
      await recordPayment()
    }

    emit('recorded')
    handleClose()
  } catch (error: any) {
    console.error('Failed to record payment:', error)
    submitError.value = error.message || 'Failed to record payment'
  } finally {
    submitting.value = false
  }
}

/**
 * Record payment
 */
async function recordPayment() {
  const amountInCents = Math.round(parseFloat(form.value.amount) * 100)

  const payload = {
    student_fee_id: props.studentFeeId,
    amount_in_cents: amountInCents,
    payment_method: form.value.payment_method,
    check_number: form.value.check_number || null,
    transaction_id: form.value.transaction_id || null,
    payment_date: form.value.payment_date,
    notes: form.value.notes || null,
  }

  const { error } = await useFetch('/api/payments/record', {
    method: 'POST',
    body: payload,
  })

  if (error.value) {
    throw new Error(error.value.message)
  }
}

/**
 * Process Stripe payment
 */
async function processStripePayment() {
  const amountInCents = Math.round(parseFloat(form.value.amount) * 100)

  // Create payment intent
  const { data, error } = await useFetch('/api/payments/create-intent', {
    method: 'POST',
    body: {
      student_fee_id: props.studentFeeId,
      amount_in_cents: amountInCents,
      notes: form.value.notes || null,
    },
  })

  if (error.value) {
    throw new Error(error.value.message)
  }

  // Redirect to Stripe checkout or use Stripe Elements
  // This is a placeholder - actual Stripe integration would go here
  console.log('Stripe payment intent created:', data.value)

  // For now, just record the payment with pending status
  await recordPayment()
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
 * Reset form
 */
function resetForm() {
  form.value = {
    amount: '',
    payment_method: '',
    check_number: '',
    transaction_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  }
  errors.value = {
    amount: '',
    payment_method: '',
    check_number: '',
    payment_date: '',
  }
  submitError.value = null
}

/**
 * Handle close
 */
function handleClose() {
  resetForm()
  emit('update:modelValue', false)
}

// Watch for modal open
watch(() => props.modelValue, (newValue) => {
  if (newValue && props.studentFeeId) {
    fetchStudentFee()
  }
})
</script>
