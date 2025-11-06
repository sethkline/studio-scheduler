<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b sticky top-0 z-10">
      <div class="max-w-4xl mx-auto px-4 py-4">
        <h1 class="text-2xl font-bold text-gray-900">Mark Attendance</h1>
        <p class="text-sm text-gray-600 mt-1">{{ currentDate }}</p>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 py-6">
      <!-- Class Selection -->
      <div class="bg-white rounded-lg shadow-sm p-4 mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
        <Dropdown
          v-model="selectedClassId"
          :options="todayClasses"
          optionLabel="label"
          optionValue="value"
          placeholder="Choose a class..."
          class="w-full"
          @change="loadClassRoster"
        />
      </div>

      <!-- Roster -->
      <div v-if="selectedClassId && roster.length > 0" class="space-y-2">
        <div
          v-for="student in roster"
          :key="student.student_id"
          class="bg-white rounded-lg shadow-sm p-4"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <img
                v-if="student.photo_url"
                :src="student.photo_url"
                :alt="`${student.first_name} ${student.last_name}`"
                class="w-12 h-12 rounded-full object-cover"
              />
              <div v-else class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <i class="pi pi-user text-gray-400"></i>
              </div>
              <div>
                <div class="font-semibold text-gray-900">
                  {{ student.first_name }} {{ student.last_name }}
                </div>
                <div v-if="student.is_makeup" class="text-xs text-blue-600 mt-1">
                  <i class="pi pi-star-fill"></i> Makeup Student
                </div>
              </div>
            </div>

            <!-- Status Buttons -->
            <div class="flex gap-2">
              <Button
                :class="student.attendance?.status === 'present' ? 'bg-green-600' : 'bg-gray-200 text-gray-700'"
                size="small"
                @click="markAttendance(student, 'present')"
                :loading="isSaving && savingStudentId === student.student_id"
              >
                <i class="pi pi-check"></i>
              </Button>
              <Button
                :class="student.attendance?.status === 'tardy' ? 'bg-orange-600' : 'bg-gray-200 text-gray-700'"
                size="small"
                @click="markAttendance(student, 'tardy')"
                :loading="isSaving && savingStudentId === student.student_id"
              >
                <i class="pi pi-clock"></i>
              </Button>
              <Button
                :class="student.attendance?.status === 'absent' ? 'bg-red-600' : 'bg-gray-200 text-gray-700'"
                size="small"
                @click="markAttendance(student, 'absent')"
                :loading="isSaving && savingStudentId === student.student_id"
              >
                <i class="pi pi-times"></i>
              </Button>
            </div>
          </div>

          <!-- Status Label -->
          <div v-if="student.attendance?.status" class="mt-3 pt-3 border-t">
            <span
              :class="{
                'text-green-600': student.attendance.status === 'present',
                'text-orange-600': student.attendance.status === 'tardy',
                'text-red-600': student.attendance.status === 'absent',
                'text-blue-600': student.attendance.status === 'excused',
              }"
              class="text-sm font-medium"
            >
              {{ getStatusLabel(student.attendance.status) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="selectedClassId && !isLoadingRoster" class="bg-white rounded-lg shadow-sm p-8 text-center">
        <i class="pi pi-users text-4xl text-gray-300 mb-4"></i>
        <p class="text-gray-500">No students enrolled in this class</p>
      </div>

      <div v-else-if="!selectedClassId" class="bg-white rounded-lg shadow-sm p-8 text-center">
        <i class="pi pi-calendar text-4xl text-gray-300 mb-4"></i>
        <p class="text-gray-500">Select a class to mark attendance</p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoadingRoster" class="bg-white rounded-lg shadow-sm p-8 text-center">
        <ProgressSpinner />
        <p class="text-gray-500 mt-4">Loading roster...</p>
      </div>

      <!-- Quick Summary -->
      <div v-if="selectedClassId && roster.length > 0" class="mt-6 bg-white rounded-lg shadow-sm p-4">
        <h3 class="font-semibold text-gray-900 mb-3">Summary</h3>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold text-green-600">{{ presentCount }}</div>
            <div class="text-sm text-gray-600">Present</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-orange-600">{{ tardyCount }}</div>
            <div class="text-sm text-gray-600">Tardy</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-red-600">{{ absentCount }}</div>
            <div class="text-sm text-gray-600">Absent</div>
          </div>
        </div>
      </div>
    </div>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import type { AttendanceStatus } from '~/types/attendance'

definePageMeta({
  middleware: 'teacher', // Teachers, staff, and admin can access
})

const toast = useToast()

// State
const selectedClassId = ref<string | null>(null)
const todayClasses = ref<Array<{ label: string; value: string }>>([])
const roster = ref<any[]>([])
const isLoadingRoster = ref(false)
const isSaving = ref(false)
const savingStudentId = ref<string | null>(null)
const currentDate = ref('')

onMounted(async () => {
  const now = new Date()
  currentDate.value = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  await loadTodayClasses()
})

// Computed
const presentCount = computed(() => {
  return roster.value.filter(s => s.attendance?.status === 'present').length
})

const tardyCount = computed(() => {
  return roster.value.filter(s => s.attendance?.status === 'tardy').length
})

const absentCount = computed(() => {
  return roster.value.filter(s => s.attendance?.status === 'absent').length
})

// Methods
const loadTodayClasses = async () => {
  try {
    const { data, error } = await useFetch('/api/attendance/roster/today')
    if (error.value) throw error.value

    if (data.value && data.value.roster) {
      // Group by class
      const classMap = new Map()
      data.value.roster.forEach((entry: any) => {
        if (!classMap.has(entry.class_instance_id)) {
          classMap.set(entry.class_instance_id, {
            label: `${entry.class_name} (${entry.start_time} - ${entry.end_time})`,
            value: entry.class_instance_id,
          })
        }
      })
      todayClasses.value = Array.from(classMap.values())
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load today\'s classes',
      life: 3000,
    })
  }
}

const loadClassRoster = async () => {
  if (!selectedClassId.value) return

  isLoadingRoster.value = true
  try {
    const { data, error } = await useFetch('/api/attendance/roster/today', {
      query: { class_instance_id: selectedClassId.value },
    })
    if (error.value) throw error.value

    if (data.value && data.value.roster) {
      roster.value = data.value.roster
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load class roster',
      life: 3000,
    })
  } finally {
    isLoadingRoster.value = false
  }
}

const markAttendance = async (student: any, status: AttendanceStatus) => {
  isSaving.value = true
  savingStudentId.value = student.student_id

  try {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await $fetch('/api/attendance/mark', {
      method: 'POST',
      body: {
        student_id: student.student_id,
        class_instance_id: selectedClassId.value,
        attendance_date: today,
        status,
      },
    })

    if (error) throw error

    // Update local state
    const studentIndex = roster.value.findIndex(s => s.student_id === student.student_id)
    if (studentIndex !== -1) {
      roster.value[studentIndex].attendance = data.attendance
    }

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: `${student.first_name} marked as ${status}`,
      life: 2000,
    })
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.data?.message || 'Failed to mark attendance',
      life: 3000,
    })
  } finally {
    isSaving.value = false
    savingStudentId.value = null
  }
}

const getStatusLabel = (status: AttendanceStatus) => {
  const labels: Record<AttendanceStatus, string> = {
    present: 'Present',
    absent: 'Absent',
    excused: 'Excused',
    tardy: 'Late',
    left_early: 'Left Early',
  }
  return labels[status] || status
}
</script>

<style scoped>
/* Mobile-optimized styles */
</style>
