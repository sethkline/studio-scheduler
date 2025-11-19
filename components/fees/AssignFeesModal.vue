<template>
  <AppModal
    v-model="isOpen"
    :title="feeType ? `Assign ${feeType.name}` : 'Assign Fee'"
    size="xl"
    @close="handleClose"
  >
    <!-- Loading state -->
    <div v-if="loading" class="py-8 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <p :class="typography.body.small" class="mt-4 text-gray-500">Loading students...</p>
    </div>

    <!-- Form -->
    <div v-else>
      <!-- Fee Type Info -->
      <div class="bg-gray-50 rounded-lg p-4 mb-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p :class="typography.body.small" class="text-gray-500 mb-1">Fee Type</p>
            <p :class="typography.body.base" class="font-medium">{{ feeType?.name }}</p>
          </div>
          <div>
            <p :class="typography.body.small" class="text-gray-500 mb-1">Default Amount</p>
            <p :class="typography.body.base" class="font-medium">
              {{ formatCurrency(feeType?.default_amount_in_cents || 0) }}
            </p>
          </div>
          <div>
            <p :class="typography.body.small" class="text-gray-500 mb-1">Due Date</p>
            <p :class="typography.body.base" class="font-medium">
              {{ feeType?.due_date ? formatDate(feeType.due_date) : '—' }}
            </p>
          </div>
          <div>
            <p :class="typography.body.small" class="text-gray-500 mb-1">Early Bird</p>
            <p :class="typography.body.base" class="font-medium">
              {{ feeType?.early_bird_amount_in_cents ? formatCurrency(feeType.early_bird_amount_in_cents) : '—' }}
            </p>
          </div>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Student Selection -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <label :class="typography.body.base" class="font-medium">
              Select Students
            </label>
            <div class="flex gap-2">
              <AppButton
                variant="ghost"
                size="sm"
                @click="selectAll"
                type="button"
              >
                Select All
              </AppButton>
              <AppButton
                variant="ghost"
                size="sm"
                @click="deselectAll"
                type="button"
              >
                Deselect All
              </AppButton>
            </div>
          </div>

          <!-- Search -->
          <div class="mb-4">
            <AppInput
              v-model="searchQuery"
              placeholder="Search students..."
              type="text"
            >
              <template #iconLeft>
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </template>
            </AppInput>
          </div>

          <!-- Student List -->
          <div class="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
            <div
              v-for="student in filteredStudents"
              :key="student.id"
              class="border-b border-gray-200 last:border-b-0"
            >
              <label class="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  :value="student.id"
                  v-model="selectedStudents"
                  class="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  :disabled="student.already_assigned || submitting"
                >
                <div class="flex-1">
                  <p :class="typography.body.base" class="font-medium">
                    {{ student.first_name }} {{ student.last_name }}
                  </p>
                  <p :class="typography.body.small" class="text-gray-500">
                    {{ student.email || 'No email' }}
                  </p>
                </div>
                <span
                  v-if="student.already_assigned"
                  class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                >
                  Already assigned
                </span>
              </label>
            </div>

            <!-- Empty state -->
            <div v-if="filteredStudents.length === 0" class="p-8 text-center">
              <svg class="h-12 w-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p :class="typography.body.base" class="text-gray-500">
                {{ searchQuery ? 'No students found matching your search' : 'No students available' }}
              </p>
            </div>
          </div>

          <p :class="typography.body.small" class="text-gray-500 mt-2">
            {{ selectedStudents.length }} student{{ selectedStudents.length !== 1 ? 's' : '' }} selected
          </p>
        </div>

        <!-- Custom Amount Override -->
        <div>
          <div class="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="custom-amount"
              v-model="useCustomAmount"
              class="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              :disabled="submitting"
            >
            <label for="custom-amount" :class="typography.body.base" class="font-medium cursor-pointer">
              Use custom amount (override default)
            </label>
          </div>

          <div v-if="useCustomAmount">
            <AppInput
              v-model="customAmount"
              label="Custom Amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
              :disabled="submitting"
            >
              <template #iconLeft>
                <span class="text-gray-500">$</span>
              </template>
              <template #help>
                <span class="text-xs text-gray-500">
                  This amount will be used instead of ${{ (feeType?.default_amount_in_cents / 100).toFixed(2) }}
                </span>
              </template>
            </AppInput>
          </div>
        </div>

        <!-- Custom Due Date Override -->
        <div>
          <div class="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="custom-due-date"
              v-model="useCustomDueDate"
              class="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              :disabled="submitting"
            >
            <label for="custom-due-date" :class="typography.body.base" class="font-medium cursor-pointer">
              Use custom due date (override default)
            </label>
          </div>

          <div v-if="useCustomDueDate">
            <AppInput
              v-model="customDueDate"
              label="Custom Due Date"
              type="date"
              required
              :disabled="submitting"
            >
              <template #help>
                <span class="text-xs text-gray-500">
                  This due date will be used instead of {{ feeType?.due_date ? formatDate(feeType.due_date) : 'no default' }}
                </span>
              </template>
            </AppInput>
          </div>
        </div>

        <!-- Assignment Summary -->
        <div v-if="selectedStudents.length > 0" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <svg class="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="flex-1">
              <p :class="typography.body.small" class="font-medium text-blue-900">Assignment Summary</p>
              <ul :class="typography.body.small" class="text-blue-700 mt-2 space-y-1">
                <li>{{ selectedStudents.length }} student{{ selectedStudents.length !== 1 ? 's' : '' }} will be assigned</li>
                <li>Amount: {{ formatCurrency(finalAmount) }} per student</li>
                <li>Due date: {{ finalDueDate ? formatDate(finalDueDate) : 'Not set' }}</li>
                <li class="font-medium pt-1">Total expected: {{ formatCurrency(finalAmount * selectedStudents.length) }}</li>
              </ul>
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
            :disabled="selectedStudents.length === 0"
          >
            Assign to {{ selectedStudents.length }} Student{{ selectedStudents.length !== 1 ? 's' : '' }}
          </AppButton>
        </div>
      </form>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { typography, getInputClasses, inputs } from '~/lib/design-system'

interface Props {
  modelValue: boolean
  feeTypeId: string | null
  recitalShowId: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'assigned'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// State
const loading = ref(false)
const submitting = ref(false)
const feeType = ref<any>(null)
const students = ref<any[]>([])
const searchQuery = ref('')
const selectedStudents = ref<string[]>([])
const useCustomAmount = ref(false)
const customAmount = ref('')
const useCustomDueDate = ref(false)
const customDueDate = ref('')
const submitError = ref<string | null>(null)

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const filteredStudents = computed(() => {
  if (!searchQuery.value) return students.value

  const query = searchQuery.value.toLowerCase()
  return students.value.filter(student => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
    const email = student.email?.toLowerCase() || ''
    return fullName.includes(query) || email.includes(query)
  })
})

const finalAmount = computed(() => {
  if (useCustomAmount.value && customAmount.value) {
    return Math.round(parseFloat(customAmount.value) * 100)
  }
  return feeType.value?.default_amount_in_cents || 0
})

const finalDueDate = computed(() => {
  if (useCustomDueDate.value && customDueDate.value) {
    return customDueDate.value
  }
  return feeType.value?.due_date || null
})

/**
 * Fetch fee type and students
 */
async function fetchData() {
  if (!props.feeTypeId) return

  loading.value = true
  try {
    // Fetch fee type details
    const { data: feeTypeData, error: feeTypeError } = await useFetch(
      `/api/fee-types/${props.feeTypeId}`
    )

    if (feeTypeError.value) {
      throw new Error(feeTypeError.value.message)
    }

    feeType.value = feeTypeData.value

    // Fetch students for this recital
    const { data: studentsData, error: studentsError } = await useFetch(
      `/api/recitals/${props.recitalShowId}/students-for-fees?fee_type_id=${props.feeTypeId}`
    )

    if (studentsError.value) {
      throw new Error(studentsError.value.message)
    }

    students.value = studentsData.value || []
  } catch (error: any) {
    console.error('Failed to fetch data:', error)
    submitError.value = 'Failed to load fee type and students'
  } finally {
    loading.value = false
  }
}

/**
 * Select all available students
 */
function selectAll() {
  selectedStudents.value = students.value
    .filter(s => !s.already_assigned)
    .map(s => s.id)
}

/**
 * Deselect all students
 */
function deselectAll() {
  selectedStudents.value = []
}

/**
 * Handle submit
 */
async function handleSubmit() {
  if (selectedStudents.value.length === 0) return

  submitting.value = true
  submitError.value = null

  try {
    const payload = {
      fee_type_id: props.feeTypeId,
      student_ids: selectedStudents.value,
      custom_amount_in_cents: useCustomAmount.value ? finalAmount.value : null,
      custom_due_date: useCustomDueDate.value ? finalDueDate.value : null,
    }

    const { error } = await useFetch(`/api/recitals/${props.recitalShowId}/assign-fees`, {
      method: 'POST',
      body: payload,
    })

    if (error.value) {
      throw new Error(error.value.message)
    }

    emit('assigned')
    handleClose()
  } catch (error: any) {
    console.error('Failed to assign fees:', error)
    submitError.value = error.message || 'Failed to assign fees'
  } finally {
    submitting.value = false
  }
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

/**
 * Reset form
 */
function resetForm() {
  selectedStudents.value = []
  searchQuery.value = ''
  useCustomAmount.value = false
  customAmount.value = ''
  useCustomDueDate.value = false
  customDueDate.value = ''
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
  if (newValue && props.feeTypeId) {
    fetchData()
  }
})
</script>
