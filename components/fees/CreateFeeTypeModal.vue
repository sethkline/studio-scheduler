<template>
  <AppModal
    v-model="isOpen"
    :title="isEditing ? 'Edit Fee Type' : 'Create Fee Type'"
    size="lg"
    @close="handleClose"
  >
    <form @submit.prevent="handleSubmit">
      <!-- Fee Name & Type -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <AppInput
          v-model="form.name"
          label="Fee Name"
          placeholder="e.g., Participation Fee"
          required
        />

        <div>
          <label :class="inputs.label">Fee Type</label>
          <select
            v-model="form.fee_type"
            :class="getInputClasses()"
            required
          >
            <option value="">Select type...</option>
            <option value="participation">Participation Fee</option>
            <option value="costume">Costume Rental</option>
            <option value="makeup">Makeup/Hair</option>
            <option value="props">Props Fee</option>
            <option value="ticket">Ticket Fee</option>
            <option value="photo">Photo Package</option>
            <option value="video">Video Recording</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <!-- Description -->
      <div class="mb-4">
        <label :class="inputs.label">Description</label>
        <textarea
          v-model="form.description"
          rows="2"
          :class="getInputClasses()"
          placeholder="What does this fee cover?"
        />
      </div>

      <!-- Default Amount -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <AppInput
            v-model="form.default_amount"
            label="Default Amount ($)"
            type="number"
            step="0.01"
            min="0"
            placeholder="75.00"
            required
          />
        </div>

        <div>
          <label :class="inputs.label">Due Date</label>
          <input
            v-model="form.due_date"
            type="date"
            :class="getInputClasses()"
          />
        </div>
      </div>

      <!-- Early Bird Pricing -->
      <div class="mb-4">
        <label class="flex items-center gap-2 cursor-pointer mb-2">
          <input
            v-model="showEarlyBird"
            type="checkbox"
            class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span :class="inputs.label" class="mb-0">Early Bird Pricing</span>
        </label>

        <div v-if="showEarlyBird" class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
          <AppInput
            v-model="form.early_bird_amount"
            label="Early Bird Amount ($)"
            type="number"
            step="0.01"
            min="0"
            placeholder="65.00"
          />
          <div>
            <label :class="inputs.label">Early Bird Deadline</label>
            <input
              v-model="form.early_bird_deadline"
              type="date"
              :class="getInputClasses()"
            />
          </div>
        </div>
      </div>

      <!-- Late Fee -->
      <div class="mb-4">
        <label class="flex items-center gap-2 cursor-pointer mb-2">
          <input
            v-model="showLateFee"
            type="checkbox"
            class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span :class="inputs.label" class="mb-0">Late Fee Penalty</span>
        </label>

        <div v-if="showLateFee" class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
          <AppInput
            v-model="form.late_fee_amount"
            label="Late Fee Amount ($)"
            type="number"
            step="0.01"
            min="0"
            placeholder="10.00"
          />
          <div>
            <label :class="inputs.label">Late Fee Starts</label>
            <input
              v-model="form.late_fee_start_date"
              type="date"
              :class="getInputClasses()"
            />
          </div>
        </div>
      </div>

      <!-- Options -->
      <div class="mb-4">
        <label :class="inputs.label">Options</label>
        <div class="space-y-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="form.is_required"
              type="checkbox"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span class="text-sm text-gray-700">Required (must be paid to participate)</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="form.is_active"
              type="checkbox"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span class="text-sm text-gray-700">Active (currently accepting payments)</span>
          </label>
        </div>
      </div>

      <!-- Error message -->
      <AppAlert
        v-if="error"
        variant="error"
        :description="error"
        dismissible
        class="mb-4"
        @close="error = ''"
      />
    </form>

    <template #footer>
      <AppButton
        variant="secondary"
        @click="handleClose"
      >
        Cancel
      </AppButton>
      <AppButton
        variant="primary"
        :loading="submitting"
        @click="handleSubmit"
      >
        {{ isEditing ? 'Update Fee Type' : 'Create Fee Type' }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { inputs, getInputClasses } from '~/lib/design-system'

interface Props {
  modelValue: boolean
  recitalShowId: string
  feeTypeId?: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: []
  updated: []
}>()

// Local state
const isOpen = ref(props.modelValue)
const submitting = ref(false)
const error = ref('')
const showEarlyBird = ref(false)
const showLateFee = ref(false)

// Form data
const form = ref({
  name: '',
  fee_type: '',
  description: '',
  default_amount: '',
  due_date: '',
  early_bird_amount: '',
  early_bird_deadline: '',
  late_fee_amount: '',
  late_fee_start_date: '',
  is_required: false,
  is_active: true,
})

// Computed
const isEditing = computed(() => !!props.feeTypeId)

/**
 * Watch for modal visibility changes
 */
watch(() => props.modelValue, (newValue) => {
  isOpen.value = newValue
  if (newValue && props.feeTypeId) {
    loadFeeType()
  } else if (newValue) {
    resetForm()
  }
})

watch(isOpen, (newValue) => {
  emit('update:modelValue', newValue)
})

/**
 * Load fee type data for editing
 */
async function loadFeeType() {
  if (!props.feeTypeId) return

  try {
    const { data, error: fetchError } = await useFetch(`/api/fee-types/${props.feeTypeId}`)

    if (fetchError.value) {
      throw new Error(fetchError.value.message)
    }

    if (data.value) {
      const feeType = data.value
      form.value = {
        name: feeType.name,
        fee_type: feeType.fee_type,
        description: feeType.description || '',
        default_amount: (feeType.default_amount_in_cents / 100).toString(),
        due_date: feeType.due_date || '',
        early_bird_amount: feeType.early_bird_amount_in_cents
          ? (feeType.early_bird_amount_in_cents / 100).toString()
          : '',
        early_bird_deadline: feeType.early_bird_deadline || '',
        late_fee_amount: feeType.late_fee_amount_in_cents
          ? (feeType.late_fee_amount_in_cents / 100).toString()
          : '',
        late_fee_start_date: feeType.late_fee_start_date || '',
        is_required: feeType.is_required || false,
        is_active: feeType.is_active !== false,
      }

      showEarlyBird.value = !!feeType.early_bird_amount_in_cents
      showLateFee.value = !!feeType.late_fee_amount_in_cents
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load fee type'
  }
}

/**
 * Reset form to initial state
 */
function resetForm() {
  form.value = {
    name: '',
    fee_type: '',
    description: '',
    default_amount: '',
    due_date: '',
    early_bird_amount: '',
    early_bird_deadline: '',
    late_fee_amount: '',
    late_fee_start_date: '',
    is_required: false,
    is_active: true,
  }

  showEarlyBird.value = false
  showLateFee.value = false
  error.value = ''
}

/**
 * Validate form
 */
function validateForm(): boolean {
  if (!form.value.name?.trim()) {
    error.value = 'Fee name is required'
    return false
  }

  if (!form.value.fee_type) {
    error.value = 'Fee type is required'
    return false
  }

  if (!form.value.default_amount) {
    error.value = 'Default amount is required'
    return false
  }

  return true
}

/**
 * Handle form submission
 */
async function handleSubmit() {
  error.value = ''

  if (!validateForm()) {
    return
  }

  submitting.value = true

  try {
    const payload = {
      recital_show_id: props.recitalShowId,
      name: form.value.name,
      fee_type: form.value.fee_type,
      description: form.value.description,
      default_amount_in_cents: Math.round(parseFloat(form.value.default_amount) * 100),
      due_date: form.value.due_date || null,
      early_bird_amount_in_cents: showEarlyBird.value && form.value.early_bird_amount
        ? Math.round(parseFloat(form.value.early_bird_amount) * 100)
        : null,
      early_bird_deadline: showEarlyBird.value ? form.value.early_bird_deadline || null : null,
      late_fee_amount_in_cents: showLateFee.value && form.value.late_fee_amount
        ? Math.round(parseFloat(form.value.late_fee_amount) * 100)
        : null,
      late_fee_start_date: showLateFee.value ? form.value.late_fee_start_date || null : null,
      is_required: form.value.is_required,
      is_active: form.value.is_active,
    }

    if (isEditing.value) {
      // Update existing fee type
      const { error: updateError } = await useFetch(`/api/fee-types/${props.feeTypeId}`, {
        method: 'PUT',
        body: payload,
      })

      if (updateError.value) {
        throw new Error(updateError.value.message)
      }

      emit('updated')
    } else {
      // Create new fee type
      const { error: createError } = await useFetch(`/api/recitals/${props.recitalShowId}/fee-types`, {
        method: 'POST',
        body: payload,
      })

      if (createError.value) {
        throw new Error(createError.value.message)
      }

      emit('created')
    }

    handleClose()
  } catch (err: any) {
    error.value = err.message || 'Failed to save fee type'
  } finally {
    submitting.value = false
  }
}

/**
 * Close modal
 */
function handleClose() {
  isOpen.value = false
  resetForm()
}
</script>
