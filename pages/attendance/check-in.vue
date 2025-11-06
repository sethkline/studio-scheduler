<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Front Desk Check-In</h1>
        <p class="text-gray-600 mt-2">{{ currentDate }} - {{ currentTime }}</p>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white p-4 rounded-lg shadow">
          <div class="text-sm text-gray-600">Expected Today</div>
          <div class="text-2xl font-bold text-gray-900">{{ summary.total_expected }}</div>
        </div>
        <div class="bg-green-50 p-4 rounded-lg shadow">
          <div class="text-sm text-green-600">Checked In</div>
          <div class="text-2xl font-bold text-green-700">{{ summary.checked_in }}</div>
        </div>
        <div class="bg-yellow-50 p-4 rounded-lg shadow">
          <div class="text-sm text-yellow-600">Not Checked In</div>
          <div class="text-2xl font-bold text-yellow-700">{{ summary.not_checked_in }}</div>
        </div>
        <div class="bg-orange-50 p-4 rounded-lg shadow">
          <div class="text-sm text-orange-600">Late</div>
          <div class="text-2xl font-bold text-orange-700">{{ summary.tardy }}</div>
        </div>
      </div>

      <!-- Check-In Methods -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="flex gap-4 mb-4">
          <Button
            :class="checkInMethod === 'qr' ? 'bg-blue-600 text-white' : 'bg-gray-200'"
            @click="checkInMethod = 'qr'"
          >
            <i class="pi pi-qrcode mr-2"></i>
            Scan QR Code
          </Button>
          <Button
            :class="checkInMethod === 'search' ? 'bg-blue-600 text-white' : 'bg-gray-200'"
            @click="checkInMethod = 'search'"
          >
            <i class="pi pi-search mr-2"></i>
            Search Student
          </Button>
        </div>

        <!-- QR Scanner -->
        <div v-if="checkInMethod === 'qr'" class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <i class="pi pi-qrcode text-6xl text-gray-400 mb-4"></i>
          <p class="text-gray-600 mb-4">Scan student QR code to check in</p>
          <InputText
            v-model="qrCodeInput"
            placeholder="Or enter QR code manually..."
            class="w-full max-w-md"
            @keyup.enter="handleQRCheckIn"
            autofocus
          />
          <Button
            v-if="qrCodeInput"
            @click="handleQRCheckIn"
            class="mt-4"
            :loading="isCheckingIn"
          >
            Check In
          </Button>
        </div>

        <!-- Student Search -->
        <div v-if="checkInMethod === 'search'">
          <div class="mb-4">
            <InputText
              v-model="searchQuery"
              placeholder="Search student by name..."
              class="w-full"
              @input="filterStudents"
            />
          </div>
          <div v-if="filteredRoster.length > 0" class="max-h-96 overflow-y-auto">
            <div
              v-for="entry in filteredRoster"
              :key="`${entry.student_id}-${entry.class_instance_id}`"
              class="flex items-center justify-between p-4 border-b hover:bg-gray-50 cursor-pointer"
              @click="selectStudent(entry)"
            >
              <div class="flex items-center gap-4">
                <img
                  v-if="entry.photo_url"
                  :src="entry.photo_url"
                  :alt="`${entry.first_name} ${entry.last_name}`"
                  class="w-12 h-12 rounded-full object-cover"
                />
                <div v-else class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <i class="pi pi-user text-gray-400"></i>
                </div>
                <div>
                  <div class="font-semibold">{{ entry.first_name }} {{ entry.last_name }}</div>
                  <div class="text-sm text-gray-600">{{ entry.class_name }}</div>
                  <div class="text-xs text-gray-500">{{ entry.start_time }} - {{ entry.end_time }}</div>
                </div>
              </div>
              <div>
                <span
                  v-if="entry.attendance_status === 'present'"
                  class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  <i class="pi pi-check mr-1"></i> Checked In
                </span>
                <span
                  v-else-if="entry.attendance_status === 'tardy'"
                  class="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                >
                  <i class="pi pi-clock mr-1"></i> Late
                </span>
                <Button
                  v-else
                  @click.stop="handleManualCheckIn(entry)"
                  :loading="isCheckingIn"
                  class="bg-blue-600"
                >
                  Check In
                </Button>
              </div>
            </div>
          </div>
          <div v-else class="text-center text-gray-500 py-8">
            No students found
          </div>
        </div>
      </div>

      <!-- Today's Roster -->
      <div class="bg-white rounded-lg shadow">
        <div class="p-6 border-b">
          <h2 class="text-xl font-bold">Today's Classes</h2>
        </div>
        <div class="overflow-x-auto">
          <DataTable
            :value="groupedByClass"
            :loading="isLoadingRoster"
            stripedRows
          >
            <Column field="class_name" header="Class" sortable>
              <template #body="{ data }">
                <div>
                  <div class="font-semibold">{{ data.class_name }}</div>
                  <div class="text-sm text-gray-600">
                    {{ data.start_time }} - {{ data.end_time }}
                  </div>
                </div>
              </template>
            </Column>
            <Column field="total_students" header="Students" sortable>
              <template #body="{ data }">
                {{ data.checked_in }} / {{ data.total_students }}
              </template>
            </Column>
            <Column header="Progress">
              <template #body="{ data }">
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    class="bg-green-600 h-2.5 rounded-full"
                    :style="{ width: `${(data.checked_in / data.total_students) * 100}%` }"
                  ></div>
                </div>
              </template>
            </Column>
            <Column header="Actions">
              <template #body="{ data }">
                <Button
                  @click="viewClassRoster(data)"
                  size="small"
                  class="bg-gray-600"
                >
                  View Roster
                </Button>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
    </div>

    <!-- Success Toast -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import type { DailyRosterEntry } from '~/types/attendance'

definePageMeta({
  middleware: 'staff', // Only staff and admin can access
})

const toast = useToast()

// State
const roster = ref<DailyRosterEntry[]>([])
const isLoadingRoster = ref(true)
const checkInMethod = ref<'qr' | 'search'>('qr')
const qrCodeInput = ref('')
const searchQuery = ref('')
const isCheckingIn = ref(false)
const currentTime = ref('')
const currentDate = ref('')

// Update time
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString()
  currentDate.value = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

let timeInterval: NodeJS.Timeout

onMounted(async () => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
  await loadRoster()
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
})

// Computed
const summary = computed(() => {
  return {
    total_expected: roster.value.length,
    checked_in: roster.value.filter(r => r.attendance_status === 'present' || r.attendance_status === 'tardy').length,
    not_checked_in: roster.value.filter(r => !r.attendance_status).length,
    tardy: roster.value.filter(r => r.attendance_status === 'tardy').length,
  }
})

const filteredRoster = computed(() => {
  if (!searchQuery.value) return roster.value

  const query = searchQuery.value.toLowerCase()
  return roster.value.filter(entry =>
    `${entry.first_name} ${entry.last_name}`.toLowerCase().includes(query) ||
    entry.class_name.toLowerCase().includes(query)
  )
})

const groupedByClass = computed(() => {
  const classMap = new Map()

  roster.value.forEach(entry => {
    const key = `${entry.class_instance_id}-${entry.start_time}`
    if (!classMap.has(key)) {
      classMap.set(key, {
        class_instance_id: entry.class_instance_id,
        class_name: entry.class_name,
        start_time: entry.start_time,
        end_time: entry.end_time,
        total_students: 0,
        checked_in: 0,
        students: [],
      })
    }

    const classData = classMap.get(key)
    classData.total_students++
    if (entry.attendance_status === 'present' || entry.attendance_status === 'tardy') {
      classData.checked_in++
    }
    classData.students.push(entry)
  })

  return Array.from(classMap.values()).sort((a, b) => a.start_time.localeCompare(b.start_time))
})

// Methods
const loadRoster = async () => {
  isLoadingRoster.value = true
  try {
    const { data, error } = await useFetch('/api/attendance/roster/today')
    if (error.value) throw error.value
    if (data.value) {
      roster.value = data.value.roster
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load roster',
      life: 3000,
    })
  } finally {
    isLoadingRoster.value = false
  }
}

const handleQRCheckIn = async () => {
  if (!qrCodeInput.value) return

  isCheckingIn.value = true
  try {
    const { data, error } = await $fetch('/api/attendance/check-in', {
      method: 'POST',
      body: {
        qr_code_data: qrCodeInput.value,
      },
    })

    if (error) throw error

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `${data.student.first_name} ${data.student.last_name} checked in successfully!`,
      life: 3000,
    })

    qrCodeInput.value = ''
    await loadRoster()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Check-In Failed',
      detail: error.data?.message || error.message || 'Failed to check in student',
      life: 5000,
    })
  } finally {
    isCheckingIn.value = false
  }
}

const handleManualCheckIn = async (entry: DailyRosterEntry) => {
  isCheckingIn.value = true
  try {
    const { data, error } = await $fetch('/api/attendance/check-in', {
      method: 'POST',
      body: {
        student_id: entry.student_id,
        class_instance_id: entry.class_instance_id,
      },
    })

    if (error) throw error

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `${entry.first_name} ${entry.last_name} checked in successfully!`,
      life: 3000,
    })

    await loadRoster()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Check-In Failed',
      detail: error.data?.message || error.message || 'Failed to check in student',
      life: 5000,
    })
  } finally {
    isCheckingIn.value = false
  }
}

const selectStudent = (entry: DailyRosterEntry) => {
  if (!entry.attendance_status) {
    handleManualCheckIn(entry)
  }
}

const filterStudents = () => {
  // Reactive filtering via computed property
}

const viewClassRoster = (classData: any) => {
  // Navigate to detailed class roster page
  navigateTo(`/attendance/class/${classData.class_instance_id}`)
}
</script>

<style scoped>
/* Add any custom styles here */
</style>
