<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 :class="typography.heading.h1">Tasks & Checklist</h1>
        <p :class="typography.body.small" class="mt-1">
          Track all preparation tasks for {{ recitalShow?.name || 'this recital' }}
        </p>
      </div>

      <div class="flex gap-3">
        <AppButton
          variant="secondary"
          @click="showTemplatesModal = true"
        >
          <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          Use Template
        </AppButton>
        <AppButton
          variant="primary"
          @click="openCreateModal"
          v-if="can('canManageTasks')"
        >
          <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Task
        </AppButton>
      </div>
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
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AppCard>
          <div class="text-center">
            <p :class="typography.body.small" class="text-gray-500">Total Tasks</p>
            <p :class="typography.heading.h2" class="mt-1">{{ summary.total_tasks }}</p>
          </div>
        </AppCard>
        <AppCard>
          <div class="text-center">
            <p :class="typography.body.small" class="text-gray-500">Completed</p>
            <p :class="typography.heading.h2" class="mt-1 text-green-600">
              {{ summary.completed }}
            </p>
          </div>
        </AppCard>
        <AppCard>
          <div class="text-center">
            <p :class="typography.body.small" class="text-gray-500">In Progress</p>
            <p :class="typography.heading.h2" class="mt-1 text-blue-600">
              {{ summary.in_progress }}
            </p>
          </div>
        </AppCard>
        <AppCard>
          <div class="text-center">
            <p :class="typography.body.small" class="text-gray-500">Completion Rate</p>
            <p :class="typography.heading.h2" class="mt-1">
              {{ summary.completion_rate }}%
            </p>
          </div>
        </AppCard>
      </div>

      <!-- Progress Bar -->
      <TasksTaskProgress :summary="summary" />

      <!-- Filters -->
      <AppCard>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Status Filter -->
          <div>
            <label :class="inputs.label">Status</label>
            <select v-model="filters.status" :class="getInputClasses()" @change="applyFilters">
              <option value="">All Statuses</option>
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <!-- Category Filter -->
          <div>
            <label :class="inputs.label">Category</label>
            <select v-model="filters.category" :class="getInputClasses()" @change="applyFilters">
              <option value="">All Categories</option>
              <option value="venue">Venue</option>
              <option value="costumes">Costumes</option>
              <option value="tech">Technical</option>
              <option value="marketing">Marketing</option>
              <option value="admin">Administrative</option>
              <option value="rehearsal">Rehearsal</option>
              <option value="performance">Performance</option>
              <option value="other">Other</option>
            </select>
          </div>

          <!-- Priority Filter -->
          <div>
            <label :class="inputs.label">Priority</label>
            <select v-model="filters.priority" :class="getInputClasses()" @change="applyFilters">
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <!-- Search -->
          <div>
            <label :class="inputs.label">Search</label>
            <AppInput
              v-model="filters.search"
              placeholder="Search tasks..."
              @update:modelValue="applyFilters"
            >
              <template #iconLeft>
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </template>
            </AppInput>
          </div>
        </div>
      </AppCard>

      <!-- Tasks by Category -->
      <div v-for="categoryGroup in tasksByCategory" :key="categoryGroup.category" class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 :class="typography.heading.h3" class="flex items-center gap-2">
            <span :class="getCategoryIcon(categoryGroup.category)"></span>
            {{ getCategoryLabel(categoryGroup.category) }}
            <span class="text-sm text-gray-500 font-normal">
              ({{ categoryGroup.tasks.length }})
            </span>
          </h2>
          <span :class="typography.body.small" class="text-gray-600">
            {{ categoryGroup.completion_rate }}% Complete
          </span>
        </div>

        <!-- Task Cards -->
        <div class="space-y-2">
          <AppCard
            v-for="task in categoryGroup.tasks"
            :key="task.id"
            class="hover:shadow-md transition-shadow cursor-pointer"
            @click="openTaskDetail(task)"
          >
            <div class="flex items-start gap-4">
              <!-- Checkbox -->
              <div class="flex-shrink-0 pt-1">
                <input
                  type="checkbox"
                  :checked="task.status === 'completed'"
                  @click.stop="toggleTaskStatus(task)"
                  class="h-5 w-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
              </div>

              <!-- Task Details -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <h3
                      :class="[
                        typography.body.base,
                        'font-medium',
                        task.status === 'completed' ? 'line-through text-gray-500' : ''
                      ]"
                    >
                      {{ task.title }}
                    </h3>
                    <p
                      v-if="task.description"
                      :class="typography.body.small"
                      class="text-gray-600 mt-1"
                    >
                      {{ task.description }}
                    </p>
                  </div>

                  <!-- Priority Badge -->
                  <span
                    :class="[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                      getPriorityColor(task.priority)
                    ]"
                  >
                    {{ task.priority }}
                  </span>
                </div>

                <!-- Task Meta -->
                <div class="flex items-center gap-4 mt-3 text-sm text-gray-600">
                  <!-- Status -->
                  <span
                    :class="[
                      'inline-flex items-center px-2 py-1 rounded text-xs',
                      getStatusColor(task.status)
                    ]"
                  >
                    {{ getStatusLabel(task.status) }}
                  </span>

                  <!-- Due Date -->
                  <span v-if="task.due_date" class="flex items-center gap-1">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span :class="{ 'text-red-600 font-medium': isOverdue(task) }">
                      {{ formatDate(task.due_date) }}
                    </span>
                  </span>

                  <!-- Assigned To -->
                  <span v-if="task.assigned_to_user" class="flex items-center gap-1">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {{ task.assigned_to_user.first_name }} {{ task.assigned_to_user.last_name }}
                  </span>

                  <!-- Comments Count -->
                  <span v-if="task.comments && task.comments.length > 0" class="flex items-center gap-1">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {{ task.comments.length }}
                  </span>
                </div>
              </div>
            </div>
          </AppCard>
        </div>
      </div>

      <!-- Empty State -->
      <AppEmptyState
        v-if="filteredTasks.length === 0"
        heading="No tasks found"
        :description="filters.search || filters.status || filters.category || filters.priority
          ? 'Try adjusting your filters to see more tasks.'
          : 'Get started by creating your first task or using a template.'"
      >
        <template #icon>
          <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </template>
        <template #actions>
          <AppButton variant="primary" @click="openCreateModal">
            Create Your First Task
          </AppButton>
        </template>
      </AppEmptyState>
    </div>

    <!-- Modals -->
    <TasksCreateTaskModal
      v-model="showCreateModal"
      :recital-show-id="recitalShowId"
      :task="selectedTask"
      @created="handleTaskCreated"
      @updated="handleTaskUpdated"
    />

    <TasksTaskDetailModal
      v-model="showDetailModal"
      :task-id="selectedTaskId"
      @updated="handleTaskUpdated"
      @deleted="handleTaskDeleted"
    />

    <TasksTaskTemplatesModal
      v-model="showTemplatesModal"
      :recital-show-id="recitalShowId"
      @applied="handleTemplateApplied"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { typography, inputs, getInputClasses } from '~/lib/design-system'
import type { RecitalTask, TaskListSummary, TasksByCategory } from '~/types/tier1-features'

const route = useRoute()
const { can } = usePermissions()

// Props
const recitalShowId = computed(() => route.params.id as string)

// State
const loading = ref(false)
const recitalShow = ref<any>(null)
const tasks = ref<RecitalTask[]>([])
const summary = ref<TaskListSummary>({
  total_tasks: 0,
  not_started: 0,
  in_progress: 0,
  completed: 0,
  blocked: 0,
  overdue: 0,
  due_this_week: 0,
  completion_rate: 0,
})

// Modals
const showCreateModal = ref(false)
const showDetailModal = ref(false)
const showTemplatesModal = ref(false)
const selectedTask = ref<RecitalTask | null>(null)
const selectedTaskId = ref<string | null>(null)

// Filters
const filters = ref({
  status: '',
  category: '',
  priority: '',
  search: '',
})

/**
 * Filtered tasks
 */
const filteredTasks = computed(() => {
  let result = tasks.value

  if (filters.value.status) {
    result = result.filter(t => t.status === filters.value.status)
  }

  if (filters.value.category) {
    result = result.filter(t => t.category === filters.value.category)
  }

  if (filters.value.priority) {
    result = result.filter(t => t.priority === filters.value.priority)
  }

  if (filters.value.search) {
    const searchLower = filters.value.search.toLowerCase()
    result = result.filter(t =>
      t.title.toLowerCase().includes(searchLower) ||
      t.description?.toLowerCase().includes(searchLower)
    )
  }

  return result
})

/**
 * Group tasks by category
 */
const tasksByCategory = computed((): TasksByCategory[] => {
  const categories = Array.from(new Set(filteredTasks.value.map(t => t.category)))

  return categories.map(category => {
    const categoryTasks = filteredTasks.value.filter(t => t.category === category)
    const completed = categoryTasks.filter(t => t.status === 'completed').length
    const completion_rate = categoryTasks.length > 0
      ? Math.round((completed / categoryTasks.length) * 100)
      : 0

    return {
      category,
      tasks: categoryTasks,
      completion_rate,
    }
  }).sort((a, b) => a.category.localeCompare(b.category))
})

/**
 * Fetch tasks
 */
async function fetchTasks() {
  loading.value = true
  try {
    const { data, error } = await useFetch(`/api/recitals/${recitalShowId.value}/tasks`)

    if (error.value) {
      throw new Error(error.value.message)
    }

    tasks.value = data.value?.tasks || []
    summary.value = data.value?.summary || summary.value
    recitalShow.value = data.value?.recital
  } catch (error) {
    console.error('Failed to fetch tasks:', error)
  } finally {
    loading.value = false
  }
}

/**
 * Apply filters
 */
function applyFilters() {
  // Filters are reactive, so just waiting for computed to update
}

/**
 * Open create modal
 */
function openCreateModal(task: RecitalTask | null = null) {
  selectedTask.value = task
  showCreateModal.value = true
}

/**
 * Open task detail
 */
function openTaskDetail(task: RecitalTask) {
  selectedTaskId.value = task.id
  showDetailModal.value = true
}

/**
 * Toggle task status
 */
async function toggleTaskStatus(task: RecitalTask) {
  const newStatus = task.status === 'completed' ? 'not-started' : 'completed'

  try {
    const { error } = await useFetch(`/api/tasks/${task.id}/status`, {
      method: 'PUT',
      body: { status: newStatus },
    })

    if (error.value) {
      throw new Error(error.value.message)
    }

    // Update local task
    task.status = newStatus
    if (newStatus === 'completed') {
      task.completed_at = new Date().toISOString()
    } else {
      task.completed_at = undefined
    }

    // Refresh to update summary
    await fetchTasks()
  } catch (error) {
    console.error('Failed to update task status:', error)
  }
}

/**
 * Event handlers
 */
function handleTaskCreated() {
  showCreateModal.value = false
  fetchTasks()
}

function handleTaskUpdated() {
  showDetailModal.value = false
  fetchTasks()
}

function handleTaskDeleted() {
  showDetailModal.value = false
  fetchTasks()
}

function handleTemplateApplied() {
  showTemplatesModal.value = false
  fetchTasks()
}

/**
 * Get category label
 */
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    venue: 'Venue & Logistics',
    costumes: 'Costumes & Wardrobe',
    tech: 'Technical & Sound/Lighting',
    marketing: 'Marketing & Promotion',
    admin: 'Administrative',
    rehearsal: 'Rehearsal Preparation',
    performance: 'Performance Day',
    other: 'Other',
  }
  return labels[category] || category
}

/**
 * Get category icon
 */
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    venue: 'pi pi-building',
    costumes: 'pi pi-shopping-bag',
    tech: 'pi pi-desktop',
    marketing: 'pi pi-megaphone',
    admin: 'pi pi-file',
    rehearsal: 'pi pi-calendar',
    performance: 'pi pi-star',
    other: 'pi pi-ellipsis-h',
  }
  return icons[category] || 'pi pi-circle'
}

/**
 * Get status label
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'not-started': 'Not Started',
    'in-progress': 'In Progress',
    completed: 'Completed',
    blocked: 'Blocked',
    cancelled: 'Cancelled',
  }
  return labels[status] || status
}

/**
 * Get status color
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'not-started': 'bg-gray-100 text-gray-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    blocked: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
  }
  return colors[status] || colors['not-started']
}

/**
 * Get priority color
 */
function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  }
  return colors[priority] || colors.medium
}

/**
 * Check if task is overdue
 */
function isOverdue(task: RecitalTask): boolean {
  if (!task.due_date || task.status === 'completed') return false
  const today = new Date()
  const dueDate = new Date(task.due_date)
  return dueDate < today
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
  fetchTasks()
})
</script>
