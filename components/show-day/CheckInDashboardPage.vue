<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Show Day Check-In</h1>
        <p class="text-sm text-gray-600 mt-1">Manage student arrivals and readiness</p>
      </div>
      <AppButton variant="primary" @click="showCheckInModal = true" v-if="can('canManageRecitals')">
        <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Check In Student
      </AppButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <!-- Dashboard -->
    <div v-else class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AppCard>
          <div class="text-center">
            <p class="text-sm text-gray-500">Total Students</p>
            <p class="text-3xl font-bold mt-1">{{ summary.total_students }}</p>
          </div>
        </AppCard>
        <AppCard>
          <div class="text-center">
            <p class="text-sm text-gray-500">Checked In</p>
            <p class="text-3xl font-bold mt-1 text-green-600">{{ summary.checked_in }}</p>
          </div>
        </AppCard>
        <AppCard>
          <div class="text-center">
            <p class="text-sm text-gray-500">Not Checked In</p>
            <p class="text-3xl font-bold mt-1 text-red-600">{{ summary.not_checked_in }}</p>
          </div>
        </AppCard>
        <AppCard>
          <div class="text-center">
            <p class="text-sm text-gray-500">Ready</p>
            <p class="text-3xl font-bold mt-1 text-blue-600">{{ summary.ready_for_performance }}</p>
          </div>
        </AppCard>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex gap-6">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            @click="activeTab = tab.value"
            :class="[
              'pb-3 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab.value
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Checked In Students -->
      <AppCard v-if="activeTab === 'checked_in'">
        <h3 class="text-lg font-semibold mb-4">Checked In Students</h3>

        <div v-if="checkIns.length === 0" class="text-center py-8 text-gray-500">
          No students checked in yet
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-In Time</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dressing Room</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ready</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="checkIn in checkIns" :key="checkIn.id">
                <td class="px-4 py-3 text-sm font-medium">
                  {{ checkIn.student?.first_name }} {{ checkIn.student?.last_name }}
                </td>
                <td class="px-4 py-3 text-sm">{{ formatTime(checkIn.check_in_time) }}</td>
                <td class="px-4 py-3 text-sm">
                  <span
                    :class="[
                      'px-2 py-1 text-xs font-medium rounded',
                      arrivalStatusColor(checkIn.arrival_status)
                    ]"
                  >
                    {{ checkIn.arrival_status.replace('_', ' ') }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm">{{ checkIn.dressing_room?.room_name || '-' }}</td>
                <td class="px-4 py-3 text-sm">
                  <span v-if="checkIn.is_ready" class="text-green-600">✓ Ready</span>
                  <span v-else class="text-yellow-600">⚠ Not Ready</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <!-- Not Checked In -->
      <AppCard v-if="activeTab === 'not_checked_in'">
        <h3 class="text-lg font-semibold mb-4">Students Not Checked In</h3>

        <div v-if="notCheckedIn.length === 0" class="text-center py-8 text-green-600">
          All students have checked in!
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="student in notCheckedIn"
            :key="student.id"
            class="border border-red-200 bg-red-50 rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <p class="font-medium">{{ student.first_name }} {{ student.last_name }}</p>
            </div>
            <AppButton size="sm" variant="primary" @click="checkInStudent(student.id)">
              Check In
            </AppButton>
          </div>
        </div>
      </AppCard>
    </div>

    <!-- Check-In Modal -->
    <CheckInStudentModal
      v-model="showCheckInModal"
      :show-id="showId"
      @checked-in="fetchStatus"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePermissions } from '~/composables/usePermissions'
import type { CheckInSummary, ShowDayCheckIn } from '~/types/tier1-features'

const props = defineProps<{ showId: string }>()

const { can } = usePermissions()

const loading = ref(false)
const activeTab = ref<'checked_in' | 'not_checked_in'>('checked_in')
const showCheckInModal = ref(false)

const summary = ref<CheckInSummary>({
  total_students: 0,
  checked_in: 0,
  not_checked_in: 0,
  on_time: 0,
  late: 0,
  missing_costumes: 0,
  ready_for_performance: 0,
})

const checkIns = ref<ShowDayCheckIn[]>([])
const notCheckedIn = ref<any[]>([])

const tabs = [
  { label: 'Checked In', value: 'checked_in' },
  { label: 'Not Checked In', value: 'not_checked_in' },
]

async function fetchStatus() {
  loading.value = true
  try {
    const { data } = await useFetch(`/api/shows/${props.showId}/check-in-status`)
    if (data.value) {
      summary.value = (data.value as any).summary
      checkIns.value = (data.value as any).check_ins
      notCheckedIn.value = (data.value as any).not_checked_in
    }
  } catch (error) {
    console.error('Failed to fetch check-in status:', error)
  } finally {
    loading.value = false
  }
}

function checkInStudent(studentId: string) {
  // TODO: Open modal with pre-filled student
  showCheckInModal.value = true
}

function arrivalStatusColor(status: string) {
  const colors: Record<string, string> = {
    on_time: 'bg-green-100 text-green-800',
    early: 'bg-blue-100 text-blue-800',
    late: 'bg-yellow-100 text-yellow-800',
    very_late: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString()
}

onMounted(() => {
  fetchStatus()
})
</script>
