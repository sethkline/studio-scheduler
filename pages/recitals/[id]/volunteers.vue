<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold">Volunteer Management</h1>
        <p v-if="recital" class="text-gray-600 mt-1">{{ recital.name }}</p>
      </div>
      <Button label="Add Shift" icon="pi pi-plus" @click="showShiftDialog = true" />
    </div>

    <!-- Filter by show -->
    <div class="mb-4">
      <label class="block mb-2 text-sm">Filter by Show</label>
      <Select
        v-model="selectedShowId"
        :options="showOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All Shows"
        class="w-64"
        showClear
      />
    </div>

    <!-- Shifts Table -->
    <DataTable :value="filteredShifts" :loading="loading" stripedRows>
      <Column field="role_name" header="Role" sortable></Column>
      <Column field="shift_date" header="Date" sortable>
        <template #body="slotProps">
          {{ formatDate(slotProps.data.shift_date) }}
        </template>
      </Column>
      <Column field="start_time" header="Time" sortable>
        <template #body="slotProps">
          {{ formatTime(slotProps.data.start_time) }} - {{ formatTime(slotProps.data.end_time) }}
        </template>
      </Column>
      <Column field="recital_show.title" header="Show">
        <template #body="slotProps">
          {{ slotProps.data.recital_show?.title || 'General' }}
        </template>
      </Column>
      <Column field="location" header="Location"></Column>
      <Column header="Volunteers">
        <template #body="slotProps">
          <div class="flex items-center gap-2">
            <Tag
              :value="`${slotProps.data.volunteers_filled}/${slotProps.data.volunteers_needed}`"
              :severity="getVolunteerSeverity(slotProps.data)"
            />
            <Button
              icon="pi pi-users"
              text
              rounded
              size="small"
              @click="viewSignups(slotProps.data)"
              v-tooltip.top="'View Signups'"
            />
          </div>
        </template>
      </Column>
      <Column header="Actions">
        <template #body="slotProps">
          <div class="flex gap-2">
            <Button icon="pi pi-pencil" text rounded @click="editShift(slotProps.data)" />
            <Button icon="pi pi-trash" text rounded severity="danger" @click="confirmDeleteShift(slotProps.data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Add/Edit Shift Dialog -->
    <Dialog
      v-model:visible="showShiftDialog"
      :header="editingShift ? 'Edit Shift' : 'Add Shift'"
      :modal="true"
      :style="{ width: '600px' }"
    >
      <div class="space-y-4">
        <div>
          <label class="block mb-2">Role Name *</label>
          <InputText v-model="shiftForm.role_name" class="w-full" placeholder="e.g., Usher, Backstage Help" />
        </div>

        <div>
          <label class="block mb-2">Description</label>
          <Textarea v-model="shiftForm.description" rows="2" class="w-full" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-2">Date *</label>
            <DatePicker v-model="shiftForm.shift_date" dateFormat="yy-mm-dd" class="w-full" showIcon />
          </div>
          <div>
            <label class="block mb-2">Show (Optional)</label>
            <Select
              v-model="shiftForm.recital_show_id"
              :options="showOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="General"
              class="w-full"
              showClear
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-2">Start Time *</label>
            <InputText v-model="shiftForm.start_time" type="time" class="w-full" />
          </div>
          <div>
            <label class="block mb-2">End Time *</label>
            <InputText v-model="shiftForm.end_time" type="time" class="w-full" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-2">Volunteers Needed *</label>
            <InputNumber v-model="shiftForm.volunteers_needed" :min="1" class="w-full" />
          </div>
          <div>
            <label class="block mb-2">Location</label>
            <InputText v-model="shiftForm.location" class="w-full" placeholder="e.g., Main Entrance" />
          </div>
        </div>

        <div>
          <label class="block mb-2">Notes</label>
          <Textarea v-model="shiftForm.notes" rows="2" class="w-full" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="cancelShiftDialog" />
        <Button label="Save" icon="pi pi-check" @click="saveShift" :loading="saving" />
      </template>
    </Dialog>

    <!-- View Signups Dialog -->
    <Dialog v-model:visible="showSignupsDialog" header="Volunteer Signups" :modal="true" :style="{ width: '700px' }">
      <div v-if="selectedShift" class="mb-4">
        <h3 class="font-semibold text-lg">{{ selectedShift.role_name }}</h3>
        <p class="text-sm text-gray-600">
          {{ formatDate(selectedShift.shift_date) }} | {{ formatTime(selectedShift.start_time) }} -
          {{ formatTime(selectedShift.end_time) }}
        </p>
      </div>

      <DataTable :value="selectedShift?.signups || []" :loading="loadingSignups" stripedRows>
        <Column field="guardian.first_name" header="Volunteer">
          <template #body="slotProps">
            {{ slotProps.data.guardian?.first_name }} {{ slotProps.data.guardian?.last_name }}
          </template>
        </Column>
        <Column field="guardian.email" header="Email"></Column>
        <Column field="guardian.phone" header="Phone"></Column>
        <Column field="signup_date" header="Signed Up">
          <template #body="slotProps">
            {{ formatDate(slotProps.data.signup_date) }}
          </template>
        </Column>
        <Column field="status" header="Status">
          <template #body="slotProps">
            <Tag :value="slotProps.data.status" :severity="getSignupSeverity(slotProps.data.status)" />
          </template>
        </Column>
      </DataTable>

      <template #footer>
        <Button label="Close" icon="pi pi-times" @click="showSignupsDialog = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { VolunteerShiftWithDetails, CreateVolunteerShiftForm } from '~/types/volunteers'

definePageMeta({
  middleware: 'staff',
})

const route = useRoute()
const toast = useToast()
const confirm = useConfirm()

const recitalId = route.params.id as string

const recital = ref<any>(null)
const shifts = ref<VolunteerShiftWithDetails[]>([])
const shows = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const loadingSignups = ref(false)
const showShiftDialog = ref(false)
const showSignupsDialog = ref(false)
const editingShift = ref<VolunteerShiftWithDetails | null>(null)
const selectedShift = ref<VolunteerShiftWithDetails | null>(null)
const selectedShowId = ref<string | null>(null)

const shiftForm = ref<CreateVolunteerShiftForm>({
  recital_id: recitalId,
  recital_show_id: undefined,
  role_name: '',
  description: '',
  shift_date: '',
  start_time: '',
  end_time: '',
  volunteers_needed: 1,
  location: '',
  notes: '',
})

const showOptions = computed(() => {
  return shows.value.map((show) => ({
    label: `${show.title} - ${formatDate(show.date)}`,
    value: show.id,
  }))
})

const filteredShifts = computed(() => {
  if (!selectedShowId.value) return shifts.value
  return shifts.value.filter((shift) => shift.recital_show_id === selectedShowId.value)
})

onMounted(() => {
  fetchRecital()
  fetchShows()
  fetchShifts()
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

async function fetchShifts() {
  loading.value = true
  try {
    const { data } = await useFetch<VolunteerShiftWithDetails[]>('/api/volunteers/shifts', {
      params: { recital_id: recitalId },
    })
    if (data.value) {
      shifts.value = data.value
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load volunteer shifts', life: 3000 })
  } finally {
    loading.value = false
  }
}

function editShift(shift: VolunteerShiftWithDetails) {
  editingShift.value = shift
  shiftForm.value = {
    recital_id: recitalId,
    recital_show_id: shift.recital_show_id,
    role_name: shift.role_name,
    description: shift.description,
    shift_date: shift.shift_date,
    start_time: shift.start_time,
    end_time: shift.end_time,
    volunteers_needed: shift.volunteers_needed,
    location: shift.location,
    notes: shift.notes,
  }
  showShiftDialog.value = true
}

async function saveShift() {
  if (!shiftForm.value.role_name || !shiftForm.value.shift_date || !shiftForm.value.start_time || !shiftForm.value.end_time) {
    toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Please fill in all required fields', life: 3000 })
    return
  }

  saving.value = true
  try {
    const formData = {
      ...shiftForm.value,
      shift_date: typeof shiftForm.value.shift_date === 'string'
        ? shiftForm.value.shift_date
        : new Date(shiftForm.value.shift_date).toISOString().split('T')[0],
    }

    if (editingShift.value) {
      await $fetch(`/api/volunteers/shifts/${editingShift.value.id}`, {
        method: 'PUT',
        body: formData,
      })
      toast.add({ severity: 'success', summary: 'Success', detail: 'Shift updated', life: 3000 })
    } else {
      await $fetch('/api/volunteers/shifts', {
        method: 'POST',
        body: formData,
      })
      toast.add({ severity: 'success', summary: 'Success', detail: 'Shift created', life: 3000 })
    }
    await fetchShifts()
    cancelShiftDialog()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save shift', life: 3000 })
  } finally {
    saving.value = false
  }
}

function confirmDeleteShift(shift: VolunteerShiftWithDetails) {
  confirm.require({
    message: `Are you sure you want to delete this shift? ${shift.volunteers_filled > 0 ? 'This will cancel all signups.' : ''}`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    accept: () => deleteShift(shift),
  })
}

async function deleteShift(shift: VolunteerShiftWithDetails) {
  try {
    await $fetch(`/api/volunteers/shifts/${shift.id}`, {
      method: 'DELETE',
    })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Shift deleted', life: 3000 })
    await fetchShifts()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete shift', life: 3000 })
  }
}

function viewSignups(shift: VolunteerShiftWithDetails) {
  selectedShift.value = shift
  showSignupsDialog.value = true
}

function cancelShiftDialog() {
  showShiftDialog.value = false
  editingShift.value = null
  shiftForm.value = {
    recital_id: recitalId,
    recital_show_id: undefined,
    role_name: '',
    description: '',
    shift_date: '',
    start_time: '',
    end_time: '',
    volunteers_needed: 1,
    location: '',
    notes: '',
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

function formatTime(timeString?: string): string {
  if (!timeString) return ''
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function getVolunteerSeverity(shift: VolunteerShiftWithDetails): string {
  if (shift.volunteers_filled >= shift.volunteers_needed) return 'success'
  if (shift.volunteers_filled === 0) return 'danger'
  return 'warning'
}

function getSignupSeverity(status: string): string {
  const severities: Record<string, string> = {
    confirmed: 'success',
    cancelled: 'secondary',
    completed: 'info',
    no_show: 'danger',
  }
  return severities[status] || 'info'
}
</script>
