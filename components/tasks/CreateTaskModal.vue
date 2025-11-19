<template>
  <AppModal
    v-model="isOpen"
    :title="isEditing ? 'Edit Task' : 'Create Task'"
    size="lg"
    @close="handleClose"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Title -->
      <div>
        <AppInput
          v-model="form.title"
          label="Task Title"
          type="text"
          required
          placeholder="e.g., Book venue for recital"
          :error="errors.title"
          :disabled="submitting"
        />
      </div>

      <!-- Description -->
      <div>
        <label :class="inputs.label">Description</label>
        <textarea
          v-model="form.description"
          :class="getInputClasses()"
          rows="3"
          placeholder="Add details about this task..."
          :disabled="submitting"
        ></textarea>
      </div>

      <!-- Category and Priority -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label :class="inputs.label">Category</label>
          <select
            v-model="form.category"
            :class="getInputClasses(errors.category ? 'error' : 'default')"
            required
            :disabled="submitting"
          >
            <option value="">Select category</option>
            <option value="venue">Venue & Logistics</option>
            <option value="costumes">Costumes & Wardrobe</option>
            <option value="tech">Technical & Sound/Lighting</option>
            <option value="marketing">Marketing & Promotion</option>
            <option value="admin">Administrative</option>
            <option value="rehearsal">Rehearsal Preparation</option>
            <option value="performance">Performance Day</option>
            <option value="other">Other</option>
          </select>
          <p v-if="errors.category" :class="inputs.error">
            {{ errors.category }}
          </p>
        </div>

        <div>
          <label :class="inputs.label">Priority</label>
          <select
            v-model="form.priority"
            :class="getInputClasses(errors.priority ? 'error' : 'default')"
            required
            :disabled="submitting"
          >
            <option value="">Select priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <p v-if="errors.priority" :class="inputs.error">
            {{ errors.priority }}
          </p>
        </div>
      </div>

      <!-- Due Date and Estimated Hours -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <AppInput
            v-model="form.due_date"
            label="Due Date (Optional)"
            type="date"
            :disabled="submitting"
          />
        </div>

        <div>
          <AppInput
            v-model="form.estimated_hours"
            label="Estimated Hours (Optional)"
            type="number"
            step="0.5"
            min="0"
            placeholder="0.0"
            :disabled="submitting"
          />
        </div>
      </div>

      <!-- Assignment -->
      <div>
        <label :class="inputs.label">Assign To</label>
        <select
          v-model="form.assigned_to_user_id"
          :class="getInputClasses()"
          :disabled="submitting || loadingStaff"
        >
          <option value="">Unassigned</option>
          <option
            v-for="user in staffUsers"
            :key="user.id"
            :value="user.id"
          >
            {{ user.first_name }} {{ user.last_name }}
          </option>
        </select>
        <p :class="typography.body.small" class="text-gray-500 mt-1">
          Optionally assign this task to a specific staff member
        </p>
      </div>

      <!-- Status (only for editing) -->
      <div v-if="isEditing">
        <label :class="inputs.label">Status</label>
        <select
          v-model="form.status"
          :class="getInputClasses()"
          :disabled="submitting"
        >
          <option value="not-started">Not Started</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <!-- Notes -->
      <div>
        <label :class="inputs.label">Notes (Optional)</label>
        <textarea
          v-model="form.notes"
          :class="getInputClasses()"
          rows="3"
          placeholder="Add any additional notes or instructions..."
          :disabled="submitting"
        ></textarea>
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
        >
          {{ isEditing ? 'Update Task' : 'Create Task' }}
        </AppButton>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { typography, inputs, getInputClasses } from '~/lib/design-system'
import type { RecitalTask, TaskCategory, TaskPriority, TaskStatus } from '~/types/tier1-features'

interface Props {
  modelValue: boolean
  recitalShowId: string
  task?: RecitalTask | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'created'): void
  (e: 'updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// State
const submitting = ref(false)
const submitError = ref<string | null>(null)
const loadingStaff = ref(false)
const staffUsers = ref<any[]>([])

// Form
const form = ref({
  title: '',
  description: '',
  category: '' as TaskCategory | '',
  priority: '' as TaskPriority | '',
  due_date: '',
  estimated_hours: '',
  assigned_to_user_id: '',
  status: 'not-started' as TaskStatus,
  notes: '',
})

const errors = ref({
  title: '',
  category: '',
  priority: '',
})

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isEditing = computed(() => !!props.task)

/**
 * Fetch staff users for assignment
 */
async function fetchStaffUsers() {
  loadingStaff.value = true
  try {
    const { data, error } = await useFetch('/api/users/staff')

    if (error.value) {
      console.error('Failed to fetch staff:', error.value)
      return
    }

    staffUsers.value = data.value || []
  } catch (error) {
    console.error('Error fetching staff:', error)
  } finally {
    loadingStaff.value = false
  }
}

/**
 * Validate form
 */
function validateForm(): boolean {
  errors.value = {
    title: '',
    category: '',
    priority: '',
  }

  let isValid = true

  if (!form.value.title.trim()) {
    errors.value.title = 'Task title is required'
    isValid = false
  }

  if (!form.value.category) {
    errors.value.category = 'Please select a category'
    isValid = false
  }

  if (!form.value.priority) {
    errors.value.priority = 'Please select a priority'
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
    const payload = {
      recital_show_id: props.recitalShowId,
      title: form.value.title.trim(),
      description: form.value.description?.trim() || null,
      category: form.value.category,
      priority: form.value.priority,
      due_date: form.value.due_date || null,
      estimated_hours: form.value.estimated_hours ? parseFloat(form.value.estimated_hours) : null,
      assigned_to_user_id: form.value.assigned_to_user_id || null,
      notes: form.value.notes?.trim() || null,
      ...(isEditing.value && { status: form.value.status }),
    }

    if (isEditing.value) {
      // Update existing task
      const { error } = await useFetch(`/api/tasks/${props.task?.id}`, {
        method: 'PUT',
        body: payload,
      })

      if (error.value) {
        throw new Error(error.value.message)
      }

      emit('updated')
    } else {
      // Create new task
      const { error } = await useFetch(`/api/recitals/${props.recitalShowId}/tasks`, {
        method: 'POST',
        body: payload,
      })

      if (error.value) {
        throw new Error(error.value.message)
      }

      emit('created')
    }

    handleClose()
  } catch (error: any) {
    console.error('Failed to save task:', error)
    submitError.value = error.message || 'Failed to save task'
  } finally {
    submitting.value = false
  }
}

/**
 * Reset form
 */
function resetForm() {
  form.value = {
    title: '',
    description: '',
    category: '' as TaskCategory | '',
    priority: '' as TaskPriority | '',
    due_date: '',
    estimated_hours: '',
    assigned_to_user_id: '',
    status: 'not-started' as TaskStatus,
    notes: '',
  }
  errors.value = {
    title: '',
    category: '',
    priority: '',
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

/**
 * Load task data for editing
 */
function loadTaskData() {
  if (props.task) {
    form.value = {
      title: props.task.title,
      description: props.task.description || '',
      category: props.task.category,
      priority: props.task.priority,
      due_date: props.task.due_date || '',
      estimated_hours: props.task.estimated_hours?.toString() || '',
      assigned_to_user_id: props.task.assigned_to_user_id || '',
      status: props.task.status,
      notes: props.task.notes || '',
    }
  }
}

// Watch for modal open
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    loadTaskData()
  }
})

// Load staff on mount
onMounted(() => {
  fetchStaffUsers()
})
</script>
