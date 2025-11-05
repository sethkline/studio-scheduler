<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">Volunteer Opportunities</h1>
      <p class="text-gray-600">Sign up for volunteer shifts to support our recitals</p>
    </div>

    <!-- Volunteer Requirements Summary -->
    <Card v-if="requirements.length > 0" class="mb-6">
      <template #content>
        <h3 class="font-semibold text-lg mb-4">Your Volunteer Requirements</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div v-for="req in requirements" :key="req.id" class="border rounded-lg p-4">
            <div class="text-sm text-gray-600 mb-1">{{ req.recital?.name }}</div>
            <div class="flex items-center justify-between">
              <div>
                <div class="text-2xl font-bold" :class="req.completed_hours >= req.required_hours ? 'text-green-600' : 'text-orange-600'">
                  {{ req.completed_hours }}/{{ req.required_hours }}
                </div>
                <div class="text-xs text-gray-500">hours completed</div>
              </div>
              <i v-if="req.completed_hours >= req.required_hours" class="pi pi-check-circle text-3xl text-green-500"></i>
              <i v-else class="pi pi-clock text-3xl text-orange-500"></i>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- My Signups -->
    <Card v-if="mySignups.length > 0" class="mb-6">
      <template #content>
        <h3 class="font-semibold text-lg mb-4">My Upcoming Shifts</h3>
        <DataTable :value="mySignups" stripedRows>
          <Column field="volunteer_shift.role_name" header="Role">
            <template #body="slotProps">
              {{ slotProps.data.volunteer_shift?.role_name }}
            </template>
          </Column>
          <Column field="volunteer_shift.shift_date" header="Date" sortable>
            <template #body="slotProps">
              {{ formatDate(slotProps.data.volunteer_shift?.shift_date) }}
            </template>
          </Column>
          <Column field="volunteer_shift.start_time" header="Time">
            <template #body="slotProps">
              {{ formatTime(slotProps.data.volunteer_shift?.start_time) }} -
              {{ formatTime(slotProps.data.volunteer_shift?.end_time) }}
            </template>
          </Column>
          <Column field="volunteer_shift.location" header="Location"></Column>
          <Column field="hours_credited" header="Hours">
            <template #body="slotProps">
              {{ slotProps.data.hours_credited }}h
            </template>
          </Column>
          <Column field="status" header="Status">
            <template #body="slotProps">
              <Tag :value="slotProps.data.status" :severity="getSignupSeverity(slotProps.data.status)" />
            </template>
          </Column>
          <Column header="Actions">
            <template #body="slotProps">
              <Button
                v-if="slotProps.data.status === 'confirmed'"
                label="Cancel"
                icon="pi pi-times"
                size="small"
                severity="danger"
                text
                @click="confirmCancelSignup(slotProps.data)"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Available Shifts -->
    <Card>
      <template #content>
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-semibold text-lg">Available Volunteer Shifts</h3>
          <Select
            v-model="selectedRecitalId"
            :options="recitalOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Filter by Recital"
            class="w-64"
            showClear
          />
        </div>

        <div v-if="loading" class="text-center py-8">
          <ProgressSpinner />
        </div>

        <div v-else-if="availableShifts.length === 0" class="text-center py-8">
          <i class="pi pi-calendar text-6xl text-gray-300 mb-4"></i>
          <p class="text-lg text-gray-600">No volunteer shifts available at this time</p>
        </div>

        <DataTable v-else :value="availableShifts" stripedRows>
          <Column field="role_name" header="Role" sortable></Column>
          <Column field="description" header="Description"></Column>
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
          <Column header="Spots">
            <template #body="slotProps">
              <Tag
                :value="`${slotProps.data.volunteers_needed - slotProps.data.volunteers_filled} left`"
                :severity="getSpotsLeftSeverity(slotProps.data)"
              />
            </template>
          </Column>
          <Column header="Actions">
            <template #body="slotProps">
              <Button
                v-if="!isSignedUp(slotProps.data.id) && slotProps.data.volunteers_filled < slotProps.data.volunteers_needed"
                label="Sign Up"
                icon="pi pi-plus"
                size="small"
                @click="confirmSignup(slotProps.data)"
              />
              <Tag v-else-if="isSignedUp(slotProps.data.id)" value="Signed Up" severity="success" />
              <Tag v-else value="Full" severity="secondary" />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Confirm Signup Dialog -->
    <Dialog v-model:visible="showSignupDialog" header="Confirm Volunteer Signup" :modal="true" :style="{ width: '500px' }">
      <div v-if="selectedShift" class="space-y-4">
        <p class="text-gray-700">Please confirm you want to sign up for this volunteer shift:</p>
        <div class="bg-gray-50 p-4 rounded-lg">
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="text-gray-600">Role:</div>
            <div class="font-semibold">{{ selectedShift.role_name }}</div>
            <div class="text-gray-600">Date:</div>
            <div class="font-semibold">{{ formatDate(selectedShift.shift_date) }}</div>
            <div class="text-gray-600">Time:</div>
            <div class="font-semibold">
              {{ formatTime(selectedShift.start_time) }} - {{ formatTime(selectedShift.end_time) }}
            </div>
            <div v-if="selectedShift.location" class="text-gray-600">Location:</div>
            <div v-if="selectedShift.location" class="font-semibold">{{ selectedShift.location }}</div>
          </div>
        </div>
        <Message severity="info" :closable="false">
          You'll earn approximately {{ calculateHours(selectedShift) }} volunteer hour(s) for this shift.
        </Message>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="showSignupDialog = false" />
        <Button label="Confirm Signup" icon="pi pi-check" @click="signUpForShift" :loading="saving" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { VolunteerShiftWithDetails, VolunteerSignupWithDetails, VolunteerRequirementWithDetails } from '~/types/volunteers'

definePageMeta({
  middleware: 'parent',
})

const toast = useToast()
const confirm = useConfirm()

const shifts = ref<VolunteerShiftWithDetails[]>([])
const mySignups = ref<VolunteerSignupWithDetails[]>([])
const requirements = ref<VolunteerRequirementWithDetails[]>([])
const recitals = ref<any[]>([])
const guardianId = ref<string | null>(null)
const loading = ref(false)
const saving = ref(false)
const showSignupDialog = ref(false)
const selectedShift = ref<VolunteerShiftWithDetails | null>(null)
const selectedRecitalId = ref<string | null>(null)

const recitalOptions = computed(() => {
  return recitals.value.map((r) => ({
    label: r.name,
    value: r.id,
  }))
})

const availableShifts = computed(() => {
  if (!selectedRecitalId.value) return shifts.value
  return shifts.value.filter((shift) => shift.recital_id === selectedRecitalId.value)
})

onMounted(() => {
  fetchGuardianInfo()
  fetchShifts()
  fetchMySignups()
})

async function fetchGuardianInfo() {
  try {
    const { data } = await useFetch('/api/parent/profile')
    if (data.value) {
      guardianId.value = (data.value as any).guardian?.id
      // Fetch volunteer requirements
      await fetchRequirements()
    }
  } catch (error) {
    console.error('Failed to load guardian info:', error)
  }
}

async function fetchRequirements() {
  if (!guardianId.value) return

  try {
    const { data } = await useFetch(`/api/volunteers/requirements?guardian_id=${guardianId.value}`)
    if (data.value) {
      requirements.value = data.value as VolunteerRequirementWithDetails[]
    }
  } catch (error) {
    console.error('Failed to load volunteer requirements:', error)
  }
}

async function fetchShifts() {
  loading.value = true
  try {
    const { data } = await useFetch<VolunteerShiftWithDetails[]>('/api/volunteers/shifts')
    if (data.value) {
      shifts.value = data.value

      // Extract unique recitals
      const recitalMap = new Map()
      data.value.forEach((shift) => {
        if (shift.recital && !recitalMap.has(shift.recital.id)) {
          recitalMap.set(shift.recital.id, shift.recital)
        }
      })
      recitals.value = Array.from(recitalMap.values())
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load volunteer shifts', life: 3000 })
  } finally {
    loading.value = false
  }
}

async function fetchMySignups() {
  try {
    const { data } = await useFetch<VolunteerSignupWithDetails[]>('/api/volunteers/signups')
    if (data.value) {
      mySignups.value = data.value.filter((signup) => signup.status === 'confirmed')
    }
  } catch (error) {
    console.error('Failed to load my signups:', error)
  }
}

function isSignedUp(shiftId: string): boolean {
  return mySignups.value.some((signup) => signup.volunteer_shift_id === shiftId)
}

function confirmSignup(shift: VolunteerShiftWithDetails) {
  selectedShift.value = shift
  showSignupDialog.value = true
}

async function signUpForShift() {
  if (!selectedShift.value || !guardianId.value) return

  saving.value = true
  try {
    await $fetch('/api/volunteers/signups', {
      method: 'POST',
      body: {
        volunteer_shift_id: selectedShift.value.id,
        guardian_id: guardianId.value,
      },
    })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Successfully signed up for shift!', life: 3000 })
    await fetchShifts()
    await fetchMySignups()
    await fetchRequirements()
    showSignupDialog.value = false
  } catch (error: any) {
    const message = error.data?.message || 'Failed to sign up for shift'
    toast.add({ severity: 'error', summary: 'Error', detail: message, life: 3000 })
  } finally {
    saving.value = false
  }
}

function confirmCancelSignup(signup: VolunteerSignupWithDetails) {
  confirm.require({
    message: 'Are you sure you want to cancel this volunteer signup?',
    header: 'Confirm Cancel',
    icon: 'pi pi-exclamation-triangle',
    accept: () => cancelSignup(signup),
  })
}

async function cancelSignup(signup: VolunteerSignupWithDetails) {
  try {
    await $fetch(`/api/volunteers/signups/${signup.id}`, {
      method: 'DELETE',
    })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Signup cancelled', life: 3000 })
    await fetchShifts()
    await fetchMySignups()
    await fetchRequirements()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to cancel signup', life: 3000 })
  }
}

function calculateHours(shift: VolunteerShiftWithDetails): number {
  const start = new Date(`2000-01-01T${shift.start_time}`)
  const end = new Date(`2000-01-01T${shift.end_time}`)
  const diffMs = end.getTime() - start.getTime()
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60)))
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

function formatTime(timeString?: string): string {
  if (!timeString) return ''
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function getSpotsLeftSeverity(shift: VolunteerShiftWithDetails): string {
  const spotsLeft = shift.volunteers_needed - shift.volunteers_filled
  if (spotsLeft === 0) return 'secondary'
  if (spotsLeft === 1) return 'warning'
  return 'success'
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
