<template>
  <div>
    <!-- Summary stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <AppCard>
        <div class="text-center">
          <p :class="typography.body.small" class="text-gray-500">Total Students</p>
          <p :class="typography.heading.h2" class="mt-1">{{ totalStudents }}</p>
        </div>
      </AppCard>

      <AppCard>
        <div class="text-center">
          <p :class="typography.body.small" class="text-gray-500">Present</p>
          <p :class="typography.heading.h2" class="mt-1 text-green-600">{{ presentCount }}</p>
        </div>
      </AppCard>

      <AppCard>
        <div class="text-center">
          <p :class="typography.body.small" class="text-gray-500">Absent</p>
          <p :class="typography.heading.h2" class="mt-1 text-red-600">{{ absentCount }}</p>
        </div>
      </AppCard>

      <AppCard>
        <div class="text-center">
          <p :class="typography.body.small" class="text-gray-500">Attendance Rate</p>
          <p :class="typography.heading.h2" class="mt-1">{{ attendanceRate }}%</p>
        </div>
      </AppCard>
    </div>

    <!-- Attendance actions -->
    <div v-if="canEdit" class="flex justify-between items-center mb-4">
      <div>
        <AppButton
          size="sm"
          variant="secondary"
          @click="markAllPresent"
        >
          Mark All Present
        </AppButton>
      </div>
      <div>
        <AppButton
          size="sm"
          variant="primary"
          :loading="saving"
          @click="saveAttendance"
        >
          Save Attendance
        </AppButton>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="animate-pulse">
        <div class="h-16 bg-gray-200 rounded" />
      </div>
    </div>

    <!-- Empty state -->
    <AppEmptyState
      v-else-if="!loading && attendance.length === 0"
      heading="No students to track"
      description="Add participants to this rehearsal to start tracking attendance"
    >
      <template #icon>
        <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </template>
    </AppEmptyState>

    <!-- Attendance table -->
    <AppCard v-else no-padding>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student Name
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Check-in Time
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="record in attendance"
              :key="record.id"
              class="hover:bg-gray-50"
            >
              <!-- Student name -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ record.student?.first_name }} {{ record.student?.last_name }}
                </div>
              </td>

              <!-- Status -->
              <td class="px-6 py-4 whitespace-nowrap">
                <select
                  v-if="canEdit"
                  v-model="record.status"
                  :class="[
                    getInputClasses(),
                    'min-w-[120px]'
                  ]"
                  @change="markModified(record.id)"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="excused">Excused</option>
                  <option value="late">Late</option>
                </select>
                <span
                  v-else
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getStatusColor(record.status)
                  ]"
                >
                  {{ record.status }}
                </span>
              </td>

              <!-- Check-in time -->
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  v-if="canEdit && (record.status === 'present' || record.status === 'late')"
                  v-model="record.check_in_time"
                  type="time"
                  :class="getInputClasses()"
                  @change="markModified(record.id)"
                />
                <span v-else-if="record.check_in_time" class="text-sm text-gray-600">
                  {{ formatTime(record.check_in_time) }}
                </span>
                <span v-else class="text-sm text-gray-400">—</span>
              </td>

              <!-- Notes -->
              <td class="px-6 py-4">
                <input
                  v-if="canEdit"
                  v-model="record.notes"
                  type="text"
                  placeholder="Add note..."
                  :class="[getInputClasses(), 'min-w-[200px]']"
                  @change="markModified(record.id)"
                />
                <span v-else class="text-sm text-gray-600">
                  {{ record.notes || '—' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>

    <!-- Success message -->
    <AppAlert
      v-if="showSuccess"
      variant="success"
      title="Attendance saved"
      description="All attendance records have been updated successfully"
      :auto-dismiss="3000"
      dismissible
      class="mt-4"
      @close="showSuccess = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { typography, getInputClasses } from '~/lib/design-system'
import type { RehearsalAttendance, AttendanceStatus } from '~/types/tier1-features'

interface Props {
  rehearsalId: string
  canEdit: boolean
}

const props = defineProps<Props>()

// State
const loading = ref(false)
const saving = ref(false)
const showSuccess = ref(false)
const attendance = ref<RehearsalAttendance[]>([])
const modifiedRecords = ref<Set<string>>(new Set())

// Computed
const totalStudents = computed(() => attendance.value.length)
const presentCount = computed(() =>
  attendance.value.filter(r => r.status === 'present').length
)
const absentCount = computed(() =>
  attendance.value.filter(r => r.status === 'absent').length
)
const attendanceRate = computed(() => {
  if (totalStudents.value === 0) return 0
  return Math.round((presentCount.value / totalStudents.value) * 100)
})

/**
 * Fetch attendance records
 */
async function fetchAttendance() {
  loading.value = true
  try {
    const { data, error } = await useFetch(`/api/rehearsals/${props.rehearsalId}/attendance`)

    if (error.value) {
      throw new Error(error.value.message)
    }

    attendance.value = data.value?.attendance || []
  } catch (error) {
    console.error('Failed to fetch attendance:', error)
  } finally {
    loading.value = false
  }
}

/**
 * Mark record as modified
 */
function markModified(recordId: string) {
  modifiedRecords.value.add(recordId)
}

/**
 * Mark all students as present
 */
function markAllPresent() {
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  attendance.value.forEach(record => {
    record.status = 'present'
    record.check_in_time = currentTime
    markModified(record.id)
  })
}

/**
 * Save attendance records
 */
async function saveAttendance() {
  if (modifiedRecords.value.size === 0) {
    return
  }

  saving.value = true
  try {
    const recordsToUpdate = attendance.value.filter(r =>
      modifiedRecords.value.has(r.id)
    )

    const { error } = await useFetch(`/api/rehearsals/${props.rehearsalId}/attendance`, {
      method: 'PUT',
      body: {
        attendance: recordsToUpdate.map(r => ({
          id: r.id,
          status: r.status,
          check_in_time: r.check_in_time,
          notes: r.notes,
        })),
      },
    })

    if (error.value) {
      throw new Error(error.value.message)
    }

    modifiedRecords.value.clear()
    showSuccess.value = true
  } catch (error: any) {
    console.error('Failed to save attendance:', error)
    // TODO: Show error toast
  } finally {
    saving.value = false
  }
}

/**
 * Get status color
 */
function getStatusColor(status: AttendanceStatus): string {
  const colors: Record<AttendanceStatus, string> = {
    present: 'bg-green-100 text-green-800',
    absent: 'bg-red-100 text-red-800',
    excused: 'bg-blue-100 text-blue-800',
    late: 'bg-yellow-100 text-yellow-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Format time for display
 */
function formatTime(timeString: string): string {
  // timeString format: "HH:MM" or ISO timestamp
  if (timeString.includes('T')) {
    const date = new Date(timeString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return timeString
}

// Load data on mount
onMounted(() => {
  fetchAttendance()
})
</script>
