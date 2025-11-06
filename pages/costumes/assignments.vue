<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">Costume Assignments</h1>
      <Button label="Assign Costume" icon="pi pi-plus" @click="showAssignDialog = true" />
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <div>
        <label class="block mb-2 text-sm">Filter by Status</label>
        <Select
          v-model="filterStatus"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All Statuses"
          class="w-full"
          showClear
        />
      </div>
      <div>
        <label class="block mb-2 text-sm">Filter by Student</label>
        <InputText v-model="filterStudent" placeholder="Search student..." class="w-full" />
      </div>
      <div>
        <label class="block mb-2 text-sm">Filter by Costume</label>
        <InputText v-model="filterCostume" placeholder="Search costume..." class="w-full" />
      </div>
    </div>

    <!-- Assignments Table -->
    <DataTable :value="filteredAssignments" :loading="loading" stripedRows>
      <Column field="student.first_name" header="Student" sortable>
        <template #body="slotProps">
          {{ slotProps.data.student?.first_name }} {{ slotProps.data.student?.last_name }}
        </template>
      </Column>
      <Column field="costume.name" header="Costume" sortable>
        <template #body="slotProps">
          {{ slotProps.data.costume?.name }}
        </template>
      </Column>
      <Column field="costume.costume_type" header="Type" sortable>
        <template #body="slotProps">
          {{ slotProps.data.costume?.costume_type }}
        </template>
      </Column>
      <Column field="size_assigned" header="Size" sortable></Column>
      <Column field="recital_performance.title" header="Performance" sortable>
        <template #body="slotProps">
          {{ slotProps.data.recital_performance?.title || 'N/A' }}
        </template>
      </Column>
      <Column field="assigned_date" header="Assigned Date" sortable>
        <template #body="slotProps">
          {{ formatDate(slotProps.data.assigned_date) }}
        </template>
      </Column>
      <Column field="due_date" header="Due Date" sortable>
        <template #body="slotProps">
          {{ slotProps.data.due_date ? formatDate(slotProps.data.due_date) : 'N/A' }}
        </template>
      </Column>
      <Column field="status" header="Status" sortable>
        <template #body="slotProps">
          <Tag :value="slotProps.data.status" :severity="getStatusSeverity(slotProps.data.status)" />
        </template>
      </Column>
      <Column header="Pickup Info">
        <template #body="slotProps">
          <div v-if="slotProps.data.pickup" class="text-sm">
            <div>Picked up: {{ formatDate(slotProps.data.pickup.picked_up_at) }}</div>
            <div v-if="slotProps.data.pickup.returned_at">
              Returned: {{ formatDate(slotProps.data.pickup.returned_at) }}
            </div>
          </div>
          <span v-else class="text-gray-400">Not picked up</span>
        </template>
      </Column>
      <Column header="Actions">
        <template #body="slotProps">
          <div class="flex gap-2">
            <Button
              v-if="slotProps.data.status === 'assigned'"
              icon="pi pi-check"
              text
              rounded
              severity="success"
              v-tooltip.top="'Mark as Picked Up'"
              @click="markPickedUp(slotProps.data)"
            />
            <Button
              v-if="slotProps.data.status === 'picked_up'"
              icon="pi pi-replay"
              text
              rounded
              severity="info"
              v-tooltip.top="'Mark as Returned'"
              @click="markReturned(slotProps.data)"
            />
            <Button
              v-if="slotProps.data.status === 'picked_up'"
              icon="pi pi-exclamation-triangle"
              text
              rounded
              severity="warning"
              v-tooltip.top="'Mark as Missing'"
              @click="markMissing(slotProps.data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Assign Costume Dialog -->
    <Dialog v-model:visible="showAssignDialog" header="Assign Costume" :modal="true" :style="{ width: '600px' }">
      <div class="space-y-4">
        <div>
          <label class="block mb-2">Student *</label>
          <Select
            v-model="assignForm.student_id"
            :options="students"
            optionLabel="label"
            optionValue="value"
            filter
            placeholder="Select student"
            class="w-full"
          />
        </div>

        <div>
          <label class="block mb-2">Costume *</label>
          <Select
            v-model="assignForm.costume_id"
            :options="costumes"
            optionLabel="label"
            optionValue="value"
            filter
            placeholder="Select costume"
            class="w-full"
            @change="onCostumeChange"
          />
        </div>

        <div v-if="selectedCostumeSizes.length > 0">
          <label class="block mb-2">Size *</label>
          <Select
            v-model="assignForm.size_assigned"
            :options="selectedCostumeSizes"
            placeholder="Select size"
            class="w-full"
          />
        </div>

        <div>
          <label class="block mb-2">Performance (Optional)</label>
          <Select
            v-model="assignForm.recital_performance_id"
            :options="performances"
            optionLabel="label"
            optionValue="value"
            filter
            placeholder="Select performance"
            class="w-full"
            showClear
          />
        </div>

        <div>
          <label class="block mb-2">Due Date</label>
          <DatePicker v-model="assignForm.due_date" dateFormat="yy-mm-dd" class="w-full" showIcon />
        </div>

        <div>
          <label class="block mb-2">Notes</label>
          <Textarea v-model="assignForm.notes" rows="3" class="w-full" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="cancelAssignDialog" />
        <Button label="Assign" icon="pi pi-check" @click="assignCostume" :loading="saving" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import type { CostumeAssignmentWithDetails, Costume, AssignCostumeForm } from '~/types/costumes'

definePageMeta({
  middleware: 'staff',
})

const toast = useToast()

const assignments = ref<CostumeAssignmentWithDetails[]>([])
const students = ref<{ label: string; value: string }[]>([])
const costumes = ref<{ label: string; value: string; sizes?: string[] }[]>([])
const performances = ref<{ label: string; value: string }[]>([])

const loading = ref(false)
const saving = ref(false)
const showAssignDialog = ref(false)

const filterStatus = ref<string | null>(null)
const filterStudent = ref('')
const filterCostume = ref('')

const assignForm = ref<AssignCostumeForm>({
  student_id: '',
  costume_id: '',
  size_assigned: '',
  recital_performance_id: undefined,
  due_date: undefined,
  notes: '',
})

const statusOptions = [
  { label: 'Assigned', value: 'assigned' },
  { label: 'Picked Up', value: 'picked_up' },
  { label: 'Returned', value: 'returned' },
  { label: 'Missing', value: 'missing' },
]

const selectedCostumeSizes = computed(() => {
  const costume = costumes.value.find((c) => c.value === assignForm.value.costume_id)
  return costume?.sizes || []
})

const filteredAssignments = computed(() => {
  return assignments.value.filter((assignment) => {
    const statusMatch = !filterStatus.value || assignment.status === filterStatus.value
    const studentMatch =
      !filterStudent.value ||
      `${assignment.student?.first_name} ${assignment.student?.last_name}`
        .toLowerCase()
        .includes(filterStudent.value.toLowerCase())
    const costumeMatch =
      !filterCostume.value ||
      assignment.costume?.name?.toLowerCase().includes(filterCostume.value.toLowerCase())

    return statusMatch && studentMatch && costumeMatch
  })
})

onMounted(() => {
  fetchAssignments()
  fetchStudents()
  fetchCostumes()
  fetchPerformances()
})

async function fetchAssignments() {
  loading.value = true
  try {
    const { data } = await useFetch<CostumeAssignmentWithDetails[]>('/api/costumes/assignments')
    if (data.value) {
      assignments.value = data.value
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load assignments', life: 3000 })
  } finally {
    loading.value = false
  }
}

async function fetchStudents() {
  try {
    const { data } = await useFetch<any[]>('/api/students')
    if (data.value) {
      students.value = data.value.map((s) => ({
        label: `${s.first_name} ${s.last_name}`,
        value: s.id,
      }))
    }
  } catch (error) {
    console.error('Failed to load students:', error)
  }
}

async function fetchCostumes() {
  try {
    const { data } = await useFetch<Costume[]>('/api/costumes')
    if (data.value) {
      costumes.value = data.value
        .filter((c) => c.status === 'active')
        .map((c) => ({
          label: `${c.name} (${c.quantity_in_stock} in stock)`,
          value: c.id,
          sizes: c.sizes_available,
        }))
    }
  } catch (error) {
    console.error('Failed to load costumes:', error)
  }
}

async function fetchPerformances() {
  try {
    const { data } = await useFetch<any[]>('/api/recitals/performances')
    if (data.value) {
      performances.value = data.value.map((p) => ({
        label: p.title,
        value: p.id,
      }))
    }
  } catch (error) {
    console.error('Failed to load performances:', error)
  }
}

function onCostumeChange() {
  assignForm.value.size_assigned = ''
}

async function assignCostume() {
  if (!assignForm.value.student_id || !assignForm.value.costume_id || !assignForm.value.size_assigned) {
    toast.add({
      severity: 'warn',
      summary: 'Validation Error',
      detail: 'Student, costume, and size are required',
      life: 3000,
    })
    return
  }

  saving.value = true
  try {
    await $fetch('/api/costumes/assign', {
      method: 'POST',
      body: {
        ...assignForm.value,
        due_date: assignForm.value.due_date
          ? new Date(assignForm.value.due_date).toISOString().split('T')[0]
          : undefined,
      },
    })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Costume assigned', life: 3000 })
    await fetchAssignments()
    cancelAssignDialog()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to assign costume', life: 3000 })
  } finally {
    saving.value = false
  }
}

async function markPickedUp(assignment: CostumeAssignmentWithDetails) {
  try {
    await $fetch(`/api/costumes/assignments/${assignment.id}/pickup`, {
      method: 'POST',
    })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Marked as picked up', life: 3000 })
    await fetchAssignments()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status', life: 3000 })
  }
}

async function markReturned(assignment: CostumeAssignmentWithDetails) {
  try {
    await $fetch(`/api/costumes/assignments/${assignment.id}/return`, {
      method: 'POST',
    })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Marked as returned', life: 3000 })
    await fetchAssignments()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status', life: 3000 })
  }
}

async function markMissing(assignment: CostumeAssignmentWithDetails) {
  try {
    await $fetch(`/api/costumes/assignments/${assignment.id}/missing`, {
      method: 'POST',
    })
    toast.add({ severity: 'warning', summary: 'Updated', detail: 'Marked as missing', life: 3000 })
    await fetchAssignments()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status', life: 3000 })
  }
}

function cancelAssignDialog() {
  showAssignDialog.value = false
  assignForm.value = {
    student_id: '',
    costume_id: '',
    size_assigned: '',
    recital_performance_id: undefined,
    due_date: undefined,
    notes: '',
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

function getStatusSeverity(status: string): string {
  const severities: Record<string, string> = {
    assigned: 'info',
    picked_up: 'success',
    returned: 'secondary',
    missing: 'danger',
  }
  return severities[status] || 'info'
}
</script>
