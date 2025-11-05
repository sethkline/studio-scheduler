<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">Costume Assignments</h1>
      <p class="text-gray-600">View and manage your children's costume assignments</p>
    </div>

    <!-- Summary Cards -->
    <div v-if="assignments.length > 0" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <template #content>
          <div class="text-center">
            <div class="text-3xl font-bold text-blue-600">{{ summary.total }}</div>
            <div class="text-sm text-gray-600 mt-1">Total Assignments</div>
          </div>
        </template>
      </Card>
      <Card>
        <template #content>
          <div class="text-center">
            <div class="text-3xl font-bold text-orange-600">{{ summary.pending }}</div>
            <div class="text-sm text-gray-600 mt-1">Pending Pickup</div>
          </div>
        </template>
      </Card>
      <Card>
        <template #content>
          <div class="text-center">
            <div class="text-3xl font-bold text-green-600">{{ summary.pickedUp }}</div>
            <div class="text-sm text-gray-600 mt-1">Picked Up</div>
          </div>
        </template>
      </Card>
      <Card>
        <template #content>
          <div class="text-center">
            <div class="text-3xl font-bold text-gray-600">{{ summary.returned }}</div>
            <div class="text-sm text-gray-600 mt-1">Returned</div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Empty State -->
    <Card v-if="!loading && assignments.length === 0">
      <template #content>
        <div class="text-center py-8">
          <i class="pi pi-shopping-bag text-6xl text-gray-300 mb-4"></i>
          <p class="text-lg text-gray-600">No costume assignments yet</p>
          <p class="text-sm text-gray-500 mt-2">
            Costume assignments will appear here when they are assigned to your dancers
          </p>
        </div>
      </template>
    </Card>

    <!-- Assignments Table -->
    <DataTable v-else :value="assignments" :loading="loading" stripedRows>
      <Column field="student.first_name" header="Dancer" sortable>
        <template #body="slotProps">
          {{ slotProps.data.student?.first_name }} {{ slotProps.data.student?.last_name }}
        </template>
      </Column>
      <Column field="costume.name" header="Costume" sortable>
        <template #body="slotProps">
          <div>
            <div class="font-semibold">{{ slotProps.data.costume?.name }}</div>
            <div class="text-sm text-gray-500">{{ slotProps.data.costume?.costume_type }}</div>
          </div>
        </template>
      </Column>
      <Column field="size_assigned" header="Size" sortable></Column>
      <Column field="recital_performance.title" header="Performance" sortable>
        <template #body="slotProps">
          {{ slotProps.data.recital_performance?.title || 'General' }}
        </template>
      </Column>
      <Column field="due_date" header="Due Date" sortable>
        <template #body="slotProps">
          <div v-if="slotProps.data.due_date">
            {{ formatDate(slotProps.data.due_date) }}
            <Tag
              v-if="isDueSoon(slotProps.data.due_date)"
              value="Due Soon"
              severity="warning"
              class="ml-2"
            />
          </div>
          <span v-else class="text-gray-400">Not set</span>
        </template>
      </Column>
      <Column field="status" header="Status" sortable>
        <template #body="slotProps">
          <Tag :value="getStatusLabel(slotProps.data.status)" :severity="getStatusSeverity(slotProps.data.status)" />
        </template>
      </Column>
      <Column header="Pickup Details">
        <template #body="slotProps">
          <div v-if="slotProps.data.pickup" class="text-sm">
            <div class="flex items-center gap-2">
              <i class="pi pi-check-circle text-green-500"></i>
              <span>{{ formatDate(slotProps.data.pickup.picked_up_at) }}</span>
            </div>
            <div v-if="slotProps.data.pickup.returned_at" class="flex items-center gap-2 mt-1">
              <i class="pi pi-replay text-blue-500"></i>
              <span>Returned {{ formatDate(slotProps.data.pickup.returned_at) }}</span>
            </div>
          </div>
          <span v-else class="text-gray-400 text-sm">Not picked up</span>
        </template>
      </Column>
      <Column header="Actions">
        <template #body="slotProps">
          <Button
            v-if="slotProps.data.status === 'assigned'"
            label="Mark Picked Up"
            icon="pi pi-check"
            size="small"
            severity="success"
            @click="confirmPickup(slotProps.data)"
          />
          <span v-else class="text-sm text-gray-500">No action needed</span>
        </template>
      </Column>
    </DataTable>

    <!-- Confirm Pickup Dialog -->
    <Dialog v-model:visible="showPickupDialog" header="Confirm Costume Pickup" :modal="true" :style="{ width: '500px' }">
      <div v-if="selectedAssignment" class="space-y-4">
        <p class="text-gray-700">
          Please confirm that you are picking up the following costume:
        </p>
        <div class="bg-gray-50 p-4 rounded-lg">
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="text-gray-600">Dancer:</div>
            <div class="font-semibold">
              {{ selectedAssignment.student?.first_name }} {{ selectedAssignment.student?.last_name }}
            </div>
            <div class="text-gray-600">Costume:</div>
            <div class="font-semibold">{{ selectedAssignment.costume?.name }}</div>
            <div class="text-gray-600">Size:</div>
            <div class="font-semibold">{{ selectedAssignment.size_assigned }}</div>
            <div v-if="selectedAssignment.due_date" class="text-gray-600">Due Date:</div>
            <div v-if="selectedAssignment.due_date" class="font-semibold">
              {{ formatDate(selectedAssignment.due_date) }}
            </div>
          </div>
        </div>
        <Message severity="info" :closable="false">
          By confirming, you acknowledge receipt of this costume and responsibility for its care and timely return.
        </Message>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="showPickupDialog = false" />
        <Button label="Confirm Pickup" icon="pi pi-check" severity="success" @click="markPickedUp" :loading="saving" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import type { CostumeAssignmentWithDetails } from '~/types/costumes'

definePageMeta({
  middleware: 'parent',
})

const toast = useToast()

const assignments = ref<CostumeAssignmentWithDetails[]>([])
const loading = ref(false)
const saving = ref(false)
const showPickupDialog = ref(false)
const selectedAssignment = ref<CostumeAssignmentWithDetails | null>(null)

const summary = computed(() => {
  return {
    total: assignments.value.length,
    pending: assignments.value.filter((a) => a.status === 'assigned').length,
    pickedUp: assignments.value.filter((a) => a.status === 'picked_up').length,
    returned: assignments.value.filter((a) => a.status === 'returned').length,
  }
})

onMounted(() => {
  fetchAssignments()
})

async function fetchAssignments() {
  loading.value = true
  try {
    const { data } = await useFetch<CostumeAssignmentWithDetails[]>('/api/parent/costumes')
    if (data.value) {
      assignments.value = data.value
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load costume assignments', life: 3000 })
  } finally {
    loading.value = false
  }
}

function confirmPickup(assignment: CostumeAssignmentWithDetails) {
  selectedAssignment.value = assignment
  showPickupDialog.value = true
}

async function markPickedUp() {
  if (!selectedAssignment.value) return

  saving.value = true
  try {
    await $fetch(`/api/parent/costumes/${selectedAssignment.value.id}/pickup`, {
      method: 'POST',
    })
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Costume marked as picked up',
      life: 3000,
    })
    await fetchAssignments()
    showPickupDialog.value = false
    selectedAssignment.value = null
  } catch (error: any) {
    const message = error.data?.message || 'Failed to mark costume as picked up'
    toast.add({ severity: 'error', summary: 'Error', detail: message, life: 3000 })
  } finally {
    saving.value = false
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

function isDueSoon(dueDate: string): boolean {
  const due = new Date(dueDate)
  const today = new Date()
  const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntilDue <= 7 && daysUntilDue >= 0
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    assigned: 'Pending Pickup',
    picked_up: 'Picked Up',
    returned: 'Returned',
    missing: 'Missing',
  }
  return labels[status] || status
}

function getStatusSeverity(status: string): string {
  const severities: Record<string, string> = {
    assigned: 'warn',
    picked_up: 'success',
    returned: 'secondary',
    missing: 'danger',
  }
  return severities[status] || 'info'
}
</script>
