<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 :class="typography.heading.h1">Volunteer Management</h1>
        <p :class="typography.body.small" class="mt-1">
          Manage volunteer shifts for {{ recitalShow?.name || 'this recital' }}
        </p>
      </div>

      <div class="flex gap-3">
        <AppButton
          variant="secondary"
          @click="showMySchedule"
        >
          <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          My Schedule
        </AppButton>
        <AppButton
          variant="primary"
          @click="openCreateModal"
          v-if="can('canManageVolunteers')"
        >
          <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Shift
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
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <AppCard>
          <div class="text-center">
            <p :class="typography.body.small" class="text-gray-500">Total Shifts</p>
            <p :class="typography.heading.h2" class="mt-1">{{ summary.total_shifts }}</p>
          </div>
        </AppCard>
        <AppCard>
          <div class="text-center">
            <p :class="typography.body.small" class="text-gray-500">Open Shifts</p>
            <p :class="typography.heading.h2" class="mt-1 text-orange-600">
              {{ summary.open_shifts }}
            </p>
          </div>
        </AppCard>
        <AppCard>
          <div class="text-center">
            <p :class="typography.body.small" class="text-gray-500">Filled Shifts</p>
            <p :class="typography.heading.h2" class="mt-1 text-green-600">
              {{ summary.filled_shifts }}
            </p>
          </div>
        </AppCard>
        <AppCard>
          <div class="text-center">
            <p :class="typography.body.small" class="text-gray-500">Fill Rate</p>
            <p :class="typography.heading.h2" class="mt-1">
              {{ summary.fill_rate }}%
            </p>
          </div>
        </AppCard>
        <AppCard>
          <div class="text-center">
            <p :class="typography.body.small" class="text-gray-500">Volunteers</p>
            <p :class="typography.heading.h2" class="mt-1 text-blue-600">
              {{ summary.total_volunteers }}
            </p>
          </div>
        </AppCard>
      </div>

      <!-- Filters -->
      <AppCard>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Role Filter -->
          <div>
            <label :class="inputs.label">Role</label>
            <select v-model="filters.role" :class="getInputClasses()" @change="applyFilters">
              <option value="">All Roles</option>
              <option value="usher">Usher</option>
              <option value="ticket_scanner">Ticket Scanner</option>
              <option value="backstage">Backstage Helper</option>
              <option value="dressing_room">Dressing Room</option>
              <option value="setup">Setup Crew</option>
              <option value="cleanup">Cleanup Crew</option>
              <option value="concessions">Concessions</option>
              <option value="photographer">Photographer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div>
            <label :class="inputs.label">Status</label>
            <select v-model="filters.status" :class="getInputClasses()" @change="applyFilters">
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="filled">Filled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <!-- Date Filter -->
          <div>
            <AppInput
              v-model="filters.date"
              label="Date"
              type="date"
              @update:modelValue="applyFilters"
            />
          </div>

          <!-- Search -->
          <div>
            <AppInput
              v-model="filters.search"
              label="Search"
              placeholder="Search shifts..."
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

      <!-- Shifts by Date -->
      <div v-for="dateGroup in shiftsByDate" :key="dateGroup.date" class="space-y-3">
        <h2 :class="typography.heading.h3">
          {{ formatDateHeader(dateGroup.date) }}
          <span class="text-sm text-gray-500 font-normal ml-2">
            ({{ dateGroup.shifts.length }} shift{{ dateGroup.shifts.length !== 1 ? 's' : '' }})
          </span>
        </h2>

        <!-- Shift Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppCard
            v-for="shift in dateGroup.shifts"
            :key="shift.id"
            class="hover:shadow-md transition-shadow cursor-pointer"
            @click="openShiftDetail(shift)"
          >
            <div class="space-y-3">
              <!-- Header -->
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h3 :class="typography.body.base" class="font-medium">
                    {{ shift.title }}
                  </h3>
                  <p :class="typography.body.small" class="text-gray-600 mt-1">
                    {{ formatTime(shift.start_time) }} - {{ formatTime(shift.end_time) }}
                  </p>
                </div>
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getRoleColor(shift.role)
                  ]"
                >
                  {{ getRoleLabel(shift.role) }}
                </span>
              </div>

              <!-- Description -->
              <p v-if="shift.description" :class="typography.body.small" class="text-gray-700">
                {{ shift.description }}
              </p>

              <!-- Location -->
              <div v-if="shift.location" class="flex items-center gap-2 text-sm text-gray-600">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {{ shift.location }}
              </div>

              <!-- Slots Progress -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span :class="typography.body.small" class="text-gray-600">
                    {{ shift.slots_filled }} / {{ shift.slots_total }} volunteers
                  </span>
                  <span :class="[typography.body.small, getSlotStatusColor(shift)]">
                    {{ getSlotStatusLabel(shift) }}
                  </span>
                </div>
                <div class="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="absolute top-0 left-0 h-full bg-primary-600 transition-all duration-500"
                    :style="{ width: `${(shift.slots_filled / shift.slots_total) * 100}%` }"
                  />
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-between pt-2 border-t border-gray-200">
                <div v-if="shift.volunteers && shift.volunteers.length > 0" class="flex -space-x-2">
                  <div
                    v-for="(volunteer, index) in shift.volunteers.slice(0, 3)"
                    :key="volunteer.id"
                    class="h-8 w-8 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center text-xs font-medium text-primary-700"
                    :title="`${volunteer.first_name} ${volunteer.last_name}`"
                  >
                    {{ volunteer.first_name[0] }}{{ volunteer.last_name[0] }}
                  </div>
                  <div
                    v-if="shift.volunteers.length > 3"
                    class="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-700"
                  >
                    +{{ shift.volunteers.length - 3 }}
                  </div>
                </div>
                <div v-else>
                  <span :class="typography.body.small" class="text-gray-500">No volunteers yet</span>
                </div>

                <AppButton
                  v-if="shift.slots_filled < shift.slots_total"
                  variant="primary"
                  size="sm"
                  @click.stop="signUpForShift(shift)"
                >
                  Sign Up
                </AppButton>
                <span v-else :class="typography.body.small" class="text-green-600 font-medium">
                  Shift Full
                </span>
              </div>
            </div>
          </AppCard>
        </div>
      </div>

      <!-- Empty State -->
      <AppEmptyState
        v-if="filteredShifts.length === 0"
        heading="No volunteer shifts found"
        :description="filters.role || filters.status || filters.date || filters.search
          ? 'Try adjusting your filters to see more shifts.'
          : 'Get started by creating your first volunteer shift.'"
      >
        <template #icon>
          <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </template>
        <template #actions>
          <AppButton variant="primary" @click="openCreateModal" v-if="can('canManageVolunteers')">
            Create Your First Shift
          </AppButton>
        </template>
      </AppEmptyState>
    </div>

    <!-- Modals -->
    <VolunteersCreateShiftModal
      v-model="showCreateModal"
      :recital-show-id="recitalShowId"
      :shift="selectedShift"
      @created="handleShiftCreated"
      @updated="handleShiftUpdated"
    />

    <VolunteersShiftDetailModal
      v-model="showDetailModal"
      :shift-id="selectedShiftId"
      @updated="handleShiftUpdated"
      @deleted="handleShiftDeleted"
    />

    <VolunteersSignUpModal
      v-model="showSignUpModal"
      :shift="signUpShift"
      @signed-up="handleSignedUp"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { typography, inputs, getInputClasses } from '~/lib/design-system'
import type { VolunteerShift, ShiftWithAssignments, VolunteerSummary } from '~/types/tier1-features'

const route = useRoute()
const router = useRouter()
const { can } = usePermissions()

// Props
const recitalShowId = computed(() => route.params.id as string)

// State
const loading = ref(false)
const recitalShow = ref<any>(null)
const shifts = ref<ShiftWithAssignments[]>([])
const summary = ref<VolunteerSummary>({
  total_shifts: 0,
  open_shifts: 0,
  filled_shifts: 0,
  total_slots: 0,
  filled_slots: 0,
  fill_rate: 0,
  total_volunteers: 0,
  confirmed_volunteers: 0,
  upcoming_shifts: 0,
})

// Modals
const showCreateModal = ref(false)
const showDetailModal = ref(false)
const showSignUpModal = ref(false)
const selectedShift = ref<VolunteerShift | null>(null)
const selectedShiftId = ref<string | null>(null)
const signUpShift = ref<VolunteerShift | null>(null)

// Filters
const filters = ref({
  role: '',
  status: '',
  date: '',
  search: '',
})

/**
 * Filtered shifts
 */
const filteredShifts = computed(() => {
  let result = shifts.value

  if (filters.value.role) {
    result = result.filter(s => s.role === filters.value.role)
  }

  if (filters.value.status) {
    result = result.filter(s => s.status === filters.value.status)
  }

  if (filters.value.date) {
    result = result.filter(s => s.date === filters.value.date)
  }

  if (filters.value.search) {
    const searchLower = filters.value.search.toLowerCase()
    result = result.filter(s =>
      s.title.toLowerCase().includes(searchLower) ||
      s.description?.toLowerCase().includes(searchLower)
    )
  }

  return result
})

/**
 * Group shifts by date
 */
const shiftsByDate = computed(() => {
  const dates = Array.from(new Set(filteredShifts.value.map(s => s.date)))

  return dates.map(date => ({
    date,
    shifts: filteredShifts.value.filter(s => s.date === date)
  })).sort((a, b) => a.date.localeCompare(b.date))
})

/**
 * Fetch shifts
 */
async function fetchShifts() {
  loading.value = true
  try {
    const { data, error } = await useFetch(`/api/recitals/${recitalShowId.value}/volunteer-shifts`)

    if (error.value) {
      throw new Error(error.value.message)
    }

    shifts.value = data.value?.shifts || []
    summary.value = data.value?.summary || summary.value
    recitalShow.value = data.value?.recital
  } catch (error) {
    console.error('Failed to fetch shifts:', error)
  } finally {
    loading.value = false
  }
}

/**
 * Apply filters
 */
function applyFilters() {
  // Filters are reactive, computed updates automatically
}

/**
 * Open create modal
 */
function openCreateModal(shift: VolunteerShift | null = null) {
  selectedShift.value = shift
  showCreateModal.value = true
}

/**
 * Open shift detail
 */
function openShiftDetail(shift: VolunteerShift) {
  selectedShiftId.value = shift.id
  showDetailModal.value = true
}

/**
 * Sign up for shift
 */
function signUpForShift(shift: VolunteerShift) {
  signUpShift.value = shift
  showSignUpModal.value = true
}

/**
 * Show my schedule
 */
function showMySchedule() {
  router.push(`/recitals/${recitalShowId.value}/volunteers/my-schedule`)
}

/**
 * Event handlers
 */
function handleShiftCreated() {
  showCreateModal.value = false
  fetchShifts()
}

function handleShiftUpdated() {
  showDetailModal.value = false
  fetchShifts()
}

function handleShiftDeleted() {
  showDetailModal.value = false
  fetchShifts()
}

function handleSignedUp() {
  showSignUpModal.value = false
  fetchShifts()
}

/**
 * Get role label
 */
function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    usher: 'Usher',
    ticket_scanner: 'Ticket Scanner',
    backstage: 'Backstage',
    dressing_room: 'Dressing Room',
    setup: 'Setup',
    cleanup: 'Cleanup',
    concessions: 'Concessions',
    photographer: 'Photographer',
    other: 'Other',
  }
  return labels[role] || role
}

/**
 * Get role color
 */
function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    usher: 'bg-blue-100 text-blue-800',
    ticket_scanner: 'bg-purple-100 text-purple-800',
    backstage: 'bg-green-100 text-green-800',
    dressing_room: 'bg-pink-100 text-pink-800',
    setup: 'bg-yellow-100 text-yellow-800',
    cleanup: 'bg-orange-100 text-orange-800',
    concessions: 'bg-teal-100 text-teal-800',
    photographer: 'bg-indigo-100 text-indigo-800',
    other: 'bg-gray-100 text-gray-800',
  }
  return colors[role] || colors.other
}

/**
 * Get slot status label
 */
function getSlotStatusLabel(shift: VolunteerShift): string {
  if (shift.slots_filled === 0) return 'Empty'
  if (shift.slots_filled >= shift.slots_total) return 'Full'
  return `${shift.slots_total - shift.slots_filled} needed`
}

/**
 * Get slot status color
 */
function getSlotStatusColor(shift: VolunteerShift): string {
  if (shift.slots_filled === 0) return 'text-red-600 font-medium'
  if (shift.slots_filled >= shift.slots_total) return 'text-green-600 font-medium'
  return 'text-orange-600 font-medium'
}

/**
 * Format date header
 */
function formatDateHeader(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today - ' + date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow - ' + date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }
}

/**
 * Format time
 */
function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

// Load data on mount
onMounted(() => {
  fetchShifts()
})
</script>
