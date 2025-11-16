<template>
  <AppModal
    v-model="isOpen"
    title="Task Details"
    size="xl"
    @close="handleClose"
  >
    <!-- Loading state -->
    <div v-if="loading" class="py-8 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <p :class="typography.body.small" class="mt-4 text-gray-500">Loading task details...</p>
    </div>

    <!-- Task Details -->
    <div v-else-if="task" class="space-y-6">
      <!-- Header -->
      <div>
        <div class="flex items-start justify-between mb-2">
          <h2 :class="typography.heading.h2">{{ task.title }}</h2>
          <div class="flex gap-2">
            <AppButton
              variant="secondary"
              size="sm"
              @click="handleEdit"
              v-if="can('canManageTasks')"
            >
              Edit
            </AppButton>
            <AppButton
              variant="danger"
              size="sm"
              @click="handleDelete"
              v-if="can('canManageTasks')"
            >
              Delete
            </AppButton>
          </div>
        </div>

        <p v-if="task.description" :class="typography.body.base" class="text-gray-700">
          {{ task.description }}
        </p>
      </div>

      <!-- Metadata Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <p :class="typography.body.small" class="text-gray-500">Status</p>
          <span
            :class="[
              'inline-flex items-center px-2 py-1 rounded text-sm mt-1',
              getStatusColor(task.status)
            ]"
          >
            {{ getStatusLabel(task.status) }}
          </span>
        </div>

        <div>
          <p :class="typography.body.small" class="text-gray-500">Priority</p>
          <span
            :class="[
              'inline-flex items-center px-2 py-1 rounded text-sm mt-1',
              getPriorityColor(task.priority)
            ]"
          >
            {{ task.priority }}
          </span>
        </div>

        <div>
          <p :class="typography.body.small" class="text-gray-500">Category</p>
          <p :class="typography.body.base" class="mt-1 font-medium">
            {{ getCategoryLabel(task.category) }}
          </p>
        </div>

        <div v-if="task.due_date">
          <p :class="typography.body.small" class="text-gray-500">Due Date</p>
          <p :class="[typography.body.base, 'mt-1', isOverdue(task) ? 'text-red-600 font-medium' : '']">
            {{ formatDate(task.due_date) }}
          </p>
        </div>

        <div v-if="task.assigned_to_user">
          <p :class="typography.body.small" class="text-gray-500">Assigned To</p>
          <p :class="typography.body.base" class="mt-1">
            {{ task.assigned_to_user.first_name }} {{ task.assigned_to_user.last_name }}
          </p>
        </div>

        <div v-if="task.estimated_hours">
          <p :class="typography.body.small" class="text-gray-500">Estimated Hours</p>
          <p :class="typography.body.base" class="mt-1">
            {{ task.estimated_hours }} hours
          </p>
        </div>
      </div>

      <!-- Notes -->
      <div v-if="task.notes">
        <h3 :class="typography.heading.h4">Notes</h3>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-2">
          <p :class="typography.body.base" class="whitespace-pre-wrap">{{ task.notes }}</p>
        </div>
      </div>

      <!-- Comments Section -->
      <div>
        <h3 :class="typography.heading.h4" class="mb-3">Comments ({{ comments.length }})</h3>

        <!-- Comment List -->
        <div class="space-y-3 mb-4">
          <div
            v-for="comment in comments"
            :key="comment.id"
            class="bg-gray-50 rounded-lg p-3"
          >
            <div class="flex items-start justify-between mb-1">
              <p :class="typography.body.small" class="font-medium">
                {{ comment.user?.first_name }} {{ comment.user?.last_name }}
              </p>
              <p :class="typography.body.small" class="text-gray-500">
                {{ formatDateTime(comment.created_at) }}
              </p>
            </div>
            <p :class="typography.body.base" class="text-gray-700">
              {{ comment.comment }}
            </p>
          </div>
        </div>

        <!-- Add Comment Form -->
        <div>
          <textarea
            v-model="newComment"
            :class="getInputClasses()"
            rows="3"
            placeholder="Add a comment..."
            :disabled="addingComment"
          ></textarea>
          <div class="flex justify-end mt-2">
            <AppButton
              variant="primary"
              size="sm"
              @click="addComment"
              :loading="addingComment"
              :disabled="!newComment.trim()"
            >
              Add Comment
            </AppButton>
          </div>
        </div>
      </div>

      <!-- Completion Info -->
      <div v-if="task.completed_at" class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-center gap-2 text-green-900">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span :class="typography.body.base" class="font-medium">
            Completed {{ formatDateTime(task.completed_at) }}
            <span v-if="task.completed_by_user">
              by {{ task.completed_by_user.first_name }} {{ task.completed_by_user.last_name }}
            </span>
          </span>
        </div>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { typography, getInputClasses } from '~/lib/design-system'
import type { TaskWithDetails, TaskComment } from '~/types/tier1-features'

interface Props {
  modelValue: boolean
  taskId: string | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'updated'): void
  (e: 'deleted'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { can } = usePermissions()

// State
const loading = ref(false)
const task = ref<TaskWithDetails | null>(null)
const comments = ref<TaskComment[]>([])
const newComment = ref('')
const addingComment = ref(false)

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

/**
 * Fetch task details
 */
async function fetchTaskDetails() {
  if (!props.taskId) return

  loading.value = true
  try {
    const { data, error } = await useFetch(`/api/tasks/${props.taskId}`)

    if (error.value) {
      throw new Error(error.value.message)
    }

    task.value = data.value?.task
    comments.value = data.value?.task?.comments || []
  } catch (error) {
    console.error('Failed to fetch task:', error)
  } finally {
    loading.value = false
  }
}

/**
 * Add comment
 */
async function addComment() {
  if (!newComment.value.trim() || !props.taskId) return

  addingComment.value = true
  try {
    const { error } = await useFetch(`/api/tasks/${props.taskId}/comments`, {
      method: 'POST',
      body: { comment: newComment.value.trim() },
    })

    if (error.value) {
      throw new Error(error.value.message)
    }

    newComment.value = ''
    await fetchTaskDetails()
  } catch (error) {
    console.error('Failed to add comment:', error)
  } finally {
    addingComment.value = false
  }
}

/**
 * Handle edit
 */
function handleEdit() {
  emit('updated')
}

/**
 * Handle delete
 */
async function handleDelete() {
  if (!confirm('Are you sure you want to delete this task?')) return

  try {
    const { error } = await useFetch(`/api/tasks/${props.taskId}`, {
      method: 'DELETE',
    })

    if (error.value) {
      throw new Error(error.value.message)
    }

    emit('deleted')
  } catch (error) {
    console.error('Failed to delete task:', error)
  }
}

/**
 * Handle close
 */
function handleClose() {
  emit('update:modelValue', false)
}

/**
 * Utility functions
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'not-started': 'Not Started',
    'in-progress': 'In Progress',
    'completed': 'Completed',
    'blocked': 'Blocked',
  }
  return labels[status] || status
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'not-started': 'bg-gray-100 text-gray-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'blocked': 'bg-red-100 text-red-800',
  }
  return colors[status] || colors['not-started']
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  }
  return colors[priority] || colors.medium
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    venue: 'Venue & Logistics',
    costumes: 'Costumes & Wardrobe',
    tech: 'Technical',
    marketing: 'Marketing',
    admin: 'Administrative',
    rehearsal: 'Rehearsal',
    performance: 'Performance',
    other: 'Other',
  }
  return labels[category] || category
}

function isOverdue(task: any): boolean {
  if (!task.due_date || task.status === 'completed') return false
  return new Date(task.due_date) < new Date()
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

// Watch for modal open
watch(() => props.modelValue, (newValue) => {
  if (newValue && props.taskId) {
    fetchTaskDetails()
  }
})
</script>
