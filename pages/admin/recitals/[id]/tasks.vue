<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold">Recital Checklist</h1>
        <p v-if="recital" class="text-gray-600 mt-1">{{ recital.name }}</p>
      </div>
      <Button label="Add Task" icon="pi pi-plus" @click="showTaskDialog = true" />
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <template #content>
          <div class="text-center">
            <div class="text-3xl font-bold text-blue-600">{{ summary.total_tasks }}</div>
            <div class="text-sm text-gray-600 mt-1">Total Tasks</div>
          </div>
        </template>
      </Card>
      <Card>
        <template #content>
          <div class="text-center">
            <div class="text-3xl font-bold text-orange-600">{{ summary.pending }}</div>
            <div class="text-sm text-gray-600 mt-1">Pending</div>
          </div>
        </template>
      </Card>
      <Card>
        <template #content>
          <div class="text-center">
            <div class="text-3xl font-bold text-green-600">{{ summary.completed }}</div>
            <div class="text-sm text-gray-600 mt-1">Completed</div>
          </div>
        </template>
      </Card>
      <Card>
        <template #content>
          <div class="text-center">
            <div class="text-3xl font-bold text-red-600">{{ summary.overdue }}</div>
            <div class="text-sm text-gray-600 mt-1">Overdue</div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <Select
        v-model="filterCategory"
        :options="categoryOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All Categories"
        class="w-full"
        showClear
      />
      <Select
        v-model="filterStatus"
        :options="statusOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All Statuses"
        class="w-full"
        showClear
      />
      <Select
        v-model="filterPriority"
        :options="priorityOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All Priorities"
        class="w-full"
        showClear
      />
      <Select
        v-model="filterShowId"
        :options="showOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All Shows"
        class="w-full"
        showClear
      />
    </div>

    <!-- Tasks Table -->
    <DataTable :value="filteredTasks" :loading="loading" stripedRows>
      <Column field="title" header="Task" sortable>
        <template #body="slotProps">
          <div>
            <div class="font-semibold">{{ slotProps.data.title }}</div>
            <div v-if="slotProps.data.description" class="text-sm text-gray-500">
              {{ slotProps.data.description }}
            </div>
          </div>
        </template>
      </Column>
      <Column field="category" header="Category" sortable>
        <template #body="slotProps">
          <Tag v-if="slotProps.data.category" :value="slotProps.data.category" />
        </template>
      </Column>
      <Column field="priority" header="Priority" sortable>
        <template #body="slotProps">
          <Tag :value="slotProps.data.priority" :severity="getPrioritySeverity(slotProps.data.priority)" />
        </template>
      </Column>
      <Column field="due_date" header="Due Date" sortable>
        <template #body="slotProps">
          <div v-if="slotProps.data.due_date">
            {{ formatDate(slotProps.data.due_date) }}
            <Tag v-if="isOverdue(slotProps.data)" value="Overdue" severity="danger" class="ml-2" />
          </div>
          <span v-else class="text-gray-400">No due date</span>
        </template>
      </Column>
      <Column field="assigned_user" header="Assigned To">
        <template #body="slotProps">
          <span v-if="slotProps.data.assigned_user">
            {{ slotProps.data.assigned_user.first_name }} {{ slotProps.data.assigned_user.last_name }}
          </span>
          <span v-else class="text-gray-400">Unassigned</span>
        </template>
      </Column>
      <Column field="status" header="Status" sortable>
        <template #body="slotProps">
          <Tag :value="slotProps.data.status" :severity="getStatusSeverity(slotProps.data.status)" />
        </template>
      </Column>
      <Column header="Actions">
        <template #body="slotProps">
          <div class="flex gap-2">
            <Button
              v-if="slotProps.data.status !== 'completed'"
              icon="pi pi-check"
              text
              rounded
              severity="success"
              v-tooltip.top="'Mark Complete'"
              @click="markComplete(slotProps.data)"
            />
            <Button icon="pi pi-pencil" text rounded @click="editTask(slotProps.data)" />
            <Button
              icon="pi pi-trash"
              text
              rounded
              severity="danger"
              @click="confirmDeleteTask(slotProps.data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Add/Edit Task Dialog -->
    <Dialog
      v-model:visible="showTaskDialog"
      :header="editingTask ? 'Edit Task' : 'Add Task'"
      :modal="true"
      :style="{ width: '600px' }"
    >
      <div class="space-y-4">
        <div>
          <label class="block mb-2">Title *</label>
          <InputText v-model="taskForm.title" class="w-full" placeholder="Task title" />
        </div>

        <div>
          <label class="block mb-2">Description</label>
          <Textarea v-model="taskForm.description" rows="3" class="w-full" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-2">Category</label>
            <Select
              v-model="taskForm.category"
              :options="categoryOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select category"
              class="w-full"
            />
          </div>
          <div>
            <label class="block mb-2">Priority</label>
            <Select
              v-model="taskForm.priority"
              :options="priorityOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select priority"
              class="w-full"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-2">Due Date</label>
            <DatePicker v-model="taskForm.due_date" showTime class="w-full" showIcon />
          </div>
          <div>
            <label class="block mb-2">Show (Optional)</label>
            <Select
              v-model="taskForm.recital_show_id"
              :options="showOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="General"
              class="w-full"
              showClear
            />
          </div>
        </div>

        <div>
          <label class="block mb-2">Assign To</label>
          <Select
            v-model="taskForm.assigned_to"
            :options="staffOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Unassigned"
            class="w-full"
            filter
            showClear
          />
        </div>

        <div>
          <label class="block mb-2">Notes</label>
          <Textarea v-model="taskForm.notes" rows="2" class="w-full" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="cancelTaskDialog" />
        <Button label="Save" icon="pi pi-check" @click="saveTask" :loading="saving" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { RecitalTaskWithDetails, CreateRecitalTaskForm } from '~/types/volunteers'

definePageMeta({
  middleware: 'staff',
})

const route = useRoute()
const toast = useToast()
const confirm = useConfirm()

const recitalId = route.params.id as string

const recital = ref<any>(null)
const tasks = ref<RecitalTaskWithDetails[]>([])
const shows = ref<any[]>([])
const staff = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const showTaskDialog = ref(false)
const editingTask = ref<RecitalTaskWithDetails | null>(null)

const filterCategory = ref<string | null>(null)
const filterStatus = ref<string | null>(null)
const filterPriority = ref<string | null>(null)
const filterShowId = ref<string | null>(null)

const taskForm = ref<CreateRecitalTaskForm>({
  recital_id: recitalId,
  recital_show_id: undefined,
  title: '',
  description: '',
  category: undefined,
  priority: 'medium',
  due_date: undefined,
  assigned_to: undefined,
  notes: '',
})

const categoryOptions = [
  { label: 'Pre-Show', value: 'pre_show' },
  { label: 'Day Of', value: 'day_of' },
  { label: 'Post-Show', value: 'post_show' },
  { label: 'General', value: 'general' },
]

const priorityOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
]

const statusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
]

const showOptions = computed(() => {
  return shows.value.map((show) => ({
    label: `${show.title} - ${formatDate(show.date)}`,
    value: show.id,
  }))
})

const staffOptions = computed(() => {
  return staff.value.map((s) => ({
    label: `${s.first_name} ${s.last_name}`,
    value: s.id,
  }))
})

const filteredTasks = computed(() => {
  return tasks.value.filter((task) => {
    const categoryMatch = !filterCategory.value || task.category === filterCategory.value
    const statusMatch = !filterStatus.value || task.status === filterStatus.value
    const priorityMatch = !filterPriority.value || task.priority === filterPriority.value
    const showMatch = !filterShowId.value || task.recital_show_id === filterShowId.value

    return categoryMatch && statusMatch && priorityMatch && showMatch
  })
})

const summary = computed(() => {
  const now = new Date()
  return {
    total_tasks: tasks.value.length,
    pending: tasks.value.filter((t) => t.status === 'pending').length,
    in_progress: tasks.value.filter((t) => t.status === 'in_progress').length,
    completed: tasks.value.filter((t) => t.status === 'completed').length,
    cancelled: tasks.value.filter((t) => t.status === 'cancelled').length,
    overdue: tasks.value.filter((t) => {
      if (!t.due_date || t.status === 'completed') return false
      return new Date(t.due_date) < now
    }).length,
  }
})

onMounted(() => {
  fetchRecital()
  fetchShows()
  fetchStaff()
  fetchTasks()
})

async function fetchRecital() {
  try {
    const { data } = await useFetch(`/api/recitals/${recitalId}`)
    if (data.value) {
      recital.value = data.value
    }
  } catch (error) {
    console.error('Failed to load recital:', error)
  }
}

async function fetchShows() {
  try {
    const { data } = await useFetch(`/api/recitals/${recitalId}/shows`)
    if (data.value) {
      shows.value = data.value
    }
  } catch (error) {
    console.error('Failed to load shows:', error)
  }
}

async function fetchStaff() {
  try {
    const { data } = await useFetch('/api/settings/users?role=staff,admin')
    if (data.value) {
      staff.value = data.value as any[]
    }
  } catch (error) {
    console.error('Failed to load staff:', error)
  }
}

async function fetchTasks() {
  loading.value = true
  try {
    const { data } = await useFetch<RecitalTaskWithDetails[]>('/api/recitals/tasks', {
      params: { recital_id: recitalId },
    })
    if (data.value) {
      tasks.value = data.value
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load tasks', life: 3000 })
  } finally {
    loading.value = false
  }
}

function editTask(task: RecitalTaskWithDetails) {
  editingTask.value = task
  taskForm.value = {
    recital_id: recitalId,
    recital_show_id: task.recital_show_id,
    title: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    due_date: task.due_date,
    assigned_to: task.assigned_to,
    notes: task.notes,
  }
  showTaskDialog.value = true
}

async function saveTask() {
  if (!taskForm.value.title) {
    toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Title is required', life: 3000 })
    return
  }

  saving.value = true
  try {
    const formData = {
      ...taskForm.value,
      due_date: taskForm.value.due_date
        ? new Date(taskForm.value.due_date).toISOString()
        : undefined,
    }

    if (editingTask.value) {
      await $fetch(`/api/recitals/tasks/${editingTask.value.id}`, {
        method: 'PUT',
        body: formData,
      })
      toast.add({ severity: 'success', summary: 'Success', detail: 'Task updated', life: 3000 })
    } else {
      await $fetch('/api/recitals/tasks', {
        method: 'POST',
        body: formData,
      })
      toast.add({ severity: 'success', summary: 'Success', detail: 'Task created', life: 3000 })
    }
    await fetchTasks()
    cancelTaskDialog()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save task', life: 3000 })
  } finally {
    saving.value = false
  }
}

async function markComplete(task: RecitalTaskWithDetails) {
  try {
    await $fetch(`/api/recitals/tasks/${task.id}`, {
      method: 'PUT',
      body: { status: 'completed' },
    })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Task marked as complete', life: 3000 })
    await fetchTasks()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update task', life: 3000 })
  }
}

function confirmDeleteTask(task: RecitalTaskWithDetails) {
  confirm.require({
    message: 'Are you sure you want to delete this task?',
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    accept: () => deleteTask(task),
  })
}

async function deleteTask(task: RecitalTaskWithDetails) {
  try {
    await $fetch(`/api/recitals/tasks/${task.id}`, {
      method: 'DELETE',
    })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Task deleted', life: 3000 })
    await fetchTasks()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete task', life: 3000 })
  }
}

function cancelTaskDialog() {
  showTaskDialog.value = false
  editingTask.value = null
  taskForm.value = {
    recital_id: recitalId,
    recital_show_id: undefined,
    title: '',
    description: '',
    category: undefined,
    priority: 'medium',
    due_date: undefined,
    assigned_to: undefined,
    notes: '',
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

function isOverdue(task: RecitalTaskWithDetails): boolean {
  if (!task.due_date || task.status === 'completed') return false
  return new Date(task.due_date) < new Date()
}

function getPrioritySeverity(priority: string): string {
  const severities: Record<string, string> = {
    low: 'secondary',
    medium: 'info',
    high: 'warning',
    urgent: 'danger',
  }
  return severities[priority] || 'info'
}

function getStatusSeverity(status: string): string {
  const severities: Record<string, string> = {
    pending: 'warning',
    in_progress: 'info',
    completed: 'success',
    cancelled: 'secondary',
  }
  return severities[status] || 'info'
}
</script>
