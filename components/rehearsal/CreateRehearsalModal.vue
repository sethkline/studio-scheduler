<template>
  <AppModal
    v-model="isOpen"
    :title="isEditing ? 'Edit Rehearsal' : 'Create Rehearsal'"
    size="lg"
    @close="handleClose"
  >
    <form @submit.prevent="handleSubmit">
      <!-- Rehearsal Type & Name -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <AppInput
            v-model="form.type"
            label="Rehearsal Type"
            required
          >
            <template #default>
              <select
                v-model="form.type"
                :class="getInputClasses()"
                required
              >
                <option value="">Select type...</option>
                <option value="tech">Tech Rehearsal</option>
                <option value="dress">Dress Rehearsal</option>
                <option value="stage">Stage Rehearsal</option>
                <option value="full">Full Run-Through</option>
                <option value="other">Other</option>
              </select>
            </template>
          </AppInput>
        </div>

        <AppInput
          v-model="form.name"
          label="Rehearsal Name"
          placeholder="e.g., Dress Rehearsal - Show A"
          required
        />
      </div>

      <!-- Date & Times -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <AppInput
          v-model="form.date"
          label="Rehearsal Date"
          type="date"
          required
        />

        <AppInput
          v-model="form.start_time"
          label="Start Time"
          type="time"
          required
        />

        <AppInput
          v-model="form.end_time"
          label="End Time"
          type="time"
          required
        />
      </div>

      <!-- Location & Call Time -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <AppInput
          v-model="form.location"
          label="Location"
          placeholder="Main Theater"
        />

        <AppInput
          v-model="form.call_time"
          label="Call Time (Optional)"
          type="time"
          help-text="When students should arrive"
        />
      </div>

      <!-- Description -->
      <div class="mb-4">
        <label :class="inputs.label">Description</label>
        <textarea
          v-model="form.description"
          rows="3"
          :class="getInputClasses()"
          placeholder="Additional details about this rehearsal..."
        />
      </div>

      <!-- Requirements Checkboxes -->
      <div class="mb-4">
        <label :class="inputs.label">Requirements</label>
        <div class="space-y-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="form.requires_costumes"
              type="checkbox"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span class="text-sm text-gray-700">Costumes required</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="form.requires_props"
              type="checkbox"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span class="text-sm text-gray-700">Props required</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="form.requires_tech"
              type="checkbox"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span class="text-sm text-gray-700">Technical crew needed</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="form.parents_allowed"
              type="checkbox"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span class="text-sm text-gray-700">Parents allowed to watch</span>
          </label>
        </div>
      </div>

      <!-- Notes -->
      <div class="mb-4">
        <label :class="inputs.label">Internal Notes</label>
        <textarea
          v-model="form.notes"
          rows="2"
          :class="getInputClasses()"
          placeholder="Private notes for staff..."
        />
      </div>

      <!-- Participants Section (for create only) -->
      <div v-if="!isEditing" class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <label :class="inputs.label">Participants (Optional)</label>
          <AppButton
            type="button"
            size="sm"
            variant="ghost"
            @click="showParticipantSelector = true"
          >
            <template #icon>
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </template>
            Add Classes/Performances
          </AppButton>
        </div>

        <p :class="typography.body.small" class="text-gray-500 mb-3">
          You can add participants now or later from the rehearsal detail page
        </p>

        <!-- Selected participants list -->
        <div v-if="form.participants.length > 0" class="space-y-2">
          <div
            v-for="(participant, index) in form.participants"
            :key="index"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex-1">
              <p class="text-sm font-medium">
                {{ participant.class_name || 'Performance ' + (index + 1) }}
              </p>
              <p class="text-xs text-gray-500">
                Call time: {{ participant.call_time || 'Not set' }}
              </p>
            </div>
            <AppButton
              type="button"
              size="sm"
              variant="ghost"
              @click="removeParticipant(index)"
            >
              <template #icon>
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </template>
            </AppButton>
          </div>
        </div>
      </div>

      <!-- Error message -->
      <AppAlert
        v-if="error"
        variant="error"
        :description="error"
        dismissible
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
        {{ isEditing ? 'Update Rehearsal' : 'Create Rehearsal' }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { inputs, getInputClasses, typography } from '~/lib/design-system'
import type { CreateRehearsalInput } from '~/types/tier1-features'

interface Props {
  modelValue: boolean
  recitalShowId: string
  rehearsalId?: string | null
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
const showParticipantSelector = ref(false)

// Form data
const form = ref<CreateRehearsalInput>({
  recital_show_id: props.recitalShowId,
  name: '',
  type: '' as any,
  date: '',
  start_time: '',
  end_time: '',
  location: '',
  description: '',
  call_time: '',
  notes: '',
  participants: [],
})

// Additional form fields not in CreateRehearsalInput
const formExtras = ref({
  requires_costumes: false,
  requires_props: false,
  requires_tech: false,
  parents_allowed: false,
})

// Computed
const isEditing = computed(() => !!props.rehearsalId)

/**
 * Watch for modal visibility changes
 */
watch(() => props.modelValue, (newValue) => {
  isOpen.value = newValue
  if (newValue && props.rehearsalId) {
    loadRehearsal()
  } else if (newValue) {
    resetForm()
  }
})

watch(isOpen, (newValue) => {
  emit('update:modelValue', newValue)
})

/**
 * Load rehearsal data for editing
 */
async function loadRehearsal() {
  if (!props.rehearsalId) return

  try {
    const { data, error: fetchError } = await useFetch(`/api/rehearsals/${props.rehearsalId}`)

    if (fetchError.value) {
      throw new Error(fetchError.value.message)
    }

    if (data.value) {
      const rehearsal = data.value
      form.value = {
        recital_show_id: props.recitalShowId,
        name: rehearsal.name,
        type: rehearsal.type,
        date: rehearsal.date,
        start_time: rehearsal.start_time,
        end_time: rehearsal.end_time,
        location: rehearsal.location || '',
        description: rehearsal.description || '',
        call_time: rehearsal.call_time || '',
        notes: rehearsal.notes || '',
      }

      formExtras.value = {
        requires_costumes: rehearsal.requires_costumes || false,
        requires_props: rehearsal.requires_props || false,
        requires_tech: rehearsal.requires_tech || false,
        parents_allowed: rehearsal.parents_allowed || false,
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load rehearsal'
  }
}

/**
 * Reset form to initial state
 */
function resetForm() {
  form.value = {
    recital_show_id: props.recitalShowId,
    name: '',
    type: '' as any,
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
    call_time: '',
    notes: '',
    participants: [],
  }

  formExtras.value = {
    requires_costumes: false,
    requires_props: false,
    requires_tech: false,
    parents_allowed: false,
  }

  error.value = ''
}

/**
 * Validate form
 */
function validateForm(): boolean {
  if (!form.value.name?.trim()) {
    error.value = 'Rehearsal name is required'
    return false
  }

  if (!form.value.type) {
    error.value = 'Rehearsal type is required'
    return false
  }

  if (!form.value.date) {
    error.value = 'Rehearsal date is required'
    return false
  }

  if (!form.value.start_time) {
    error.value = 'Start time is required'
    return false
  }

  if (!form.value.end_time) {
    error.value = 'End time is required'
    return false
  }

  // Validate end time is after start time
  if (form.value.start_time >= form.value.end_time) {
    error.value = 'End time must be after start time'
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
      ...form.value,
      ...formExtras.value,
    }

    if (isEditing.value) {
      // Update existing rehearsal
      const { error: updateError } = await useFetch(`/api/rehearsals/${props.rehearsalId}`, {
        method: 'PUT',
        body: payload,
      })

      if (updateError.value) {
        throw new Error(updateError.value.message)
      }

      emit('updated')
    } else {
      // Create new rehearsal
      const { error: createError } = await useFetch(`/api/recitals/${props.recitalShowId}/rehearsals`, {
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
    error.value = err.message || 'Failed to save rehearsal'
  } finally {
    submitting.value = false
  }
}

/**
 * Remove participant from list
 */
function removeParticipant(index: number) {
  form.value.participants?.splice(index, 1)
}

/**
 * Close modal
 */
function handleClose() {
  isOpen.value = false
  resetForm()
}
</script>
