<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <!-- Page header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 :class="typography.heading.h1">Rehearsals</h1>
          <p :class="typography.body.small" class="mt-1">
            Schedule and manage rehearsals for {{ recitalShow?.name || 'your recital' }}
          </p>
        </div>

        <AppButton
          v-if="can('canManageRehearsals')"
          variant="primary"
          @click="openCreateModal"
        >
          <template #icon>
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </template>
          Create Rehearsal
        </AppButton>
      </div>
    </div>

    <!-- Filters -->
    <AppCard class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Type filter -->
        <div>
          <label :class="inputs.label">Rehearsal Type</label>
          <select
            v-model="filters.type"
            :class="getInputClasses()"
          >
            <option value="">All Types</option>
            <option value="tech">Tech</option>
            <option value="dress">Dress</option>
            <option value="stage">Stage</option>
            <option value="full">Full</option>
            <option value="other">Other</option>
          </select>
        </div>

        <!-- Status filter -->
        <div>
          <label :class="inputs.label">Status</label>
          <select
            v-model="filters.status"
            :class="getInputClasses()"
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <!-- Date from -->
        <div>
          <label :class="inputs.label">From Date</label>
          <input
            v-model="filters.dateFrom"
            type="date"
            :class="getInputClasses()"
          />
        </div>

        <!-- Date to -->
        <div>
          <label :class="inputs.label">To Date</label>
          <input
            v-model="filters.dateTo"
            type="date"
            :class="getInputClasses()"
          />
        </div>
      </div>

      <div class="mt-4 flex gap-2">
        <AppButton
          size="sm"
          variant="secondary"
          @click="applyFilters"
        >
          Apply Filters
        </AppButton>
        <AppButton
          size="sm"
          variant="ghost"
          @click="clearFilters"
        >
          Clear
        </AppButton>
      </div>
    </AppCard>

    <!-- Loading state -->
    <div v-if="loading" class="space-y-4">
      <AppCard v-for="i in 3" :key="i" class="animate-pulse">
        <div class="h-6 bg-gray-200 rounded w-1/3 mb-3" />
        <div class="h-4 bg-gray-200 rounded w-full mb-2" />
        <div class="h-4 bg-gray-200 rounded w-2/3" />
      </AppCard>
    </div>

    <!-- Empty state -->
    <AppEmptyState
      v-else-if="!loading && rehearsals.length === 0"
      heading="No rehearsals scheduled"
      description="Get started by creating your first rehearsal for this recital"
    >
      <template #icon>
        <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </template>
      <template #action>
        <AppButton
          v-if="can('canManageRehearsals')"
          variant="primary"
          @click="openCreateModal"
        >
          Create Rehearsal
        </AppButton>
      </template>
    </AppEmptyState>

    <!-- Rehearsals list -->
    <div v-else class="space-y-4">
      <AppCard
        v-for="rehearsal in rehearsals"
        :key="rehearsal.id"
        hoverable
        clickable
        @click="viewRehearsal(rehearsal.id)"
      >
        <div class="flex items-start justify-between">
          <!-- Rehearsal info -->
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <!-- Type badge -->
              <span
                :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  getTypeColor(rehearsal.type)
                ]"
              >
                {{ rehearsal.type }}
              </span>

              <!-- Status badge -->
              <span
                :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  getStatusColor(rehearsal.status)
                ]"
              >
                {{ rehearsal.status }}
              </span>
            </div>

            <h3 :class="typography.heading.h3" class="mt-2">
              {{ rehearsal.name }}
            </h3>

            <div class="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
              <!-- Date -->
              <div class="flex items-center gap-1">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ formatDate(rehearsal.date) }}
              </div>

              <!-- Time -->
              <div class="flex items-center gap-1">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ rehearsal.start_time }} - {{ rehearsal.end_time }}
              </div>

              <!-- Location -->
              <div v-if="rehearsal.location" class="flex items-center gap-1">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {{ rehearsal.location }}
              </div>
            </div>

            <!-- Attendance stats -->
            <div v-if="rehearsal.attendance_count !== undefined" class="mt-3 flex items-center gap-4 text-sm">
              <div class="flex items-center gap-1">
                <span class="font-medium">Participants:</span>
                <span class="text-gray-600">{{ rehearsal.participant_count || 0 }}</span>
              </div>
              <div class="flex items-center gap-1">
                <span class="font-medium">Attendance:</span>
                <span :class="getAttendanceColor(rehearsal)">
                  {{ rehearsal.attendance_count || 0 }} / {{ rehearsal.participant_count || 0 }}
                </span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-start gap-2">
            <AppButton
              v-if="can('canManageRehearsals')"
              size="sm"
              variant="ghost"
              @click.stop="editRehearsal(rehearsal.id)"
            >
              <template #icon>
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </template>
            </AppButton>
            <AppButton
              size="sm"
              variant="ghost"
              @click.stop="viewRehearsal(rehearsal.id)"
            >
              View Details
            </AppButton>
          </div>
        </div>
      </AppCard>
    </div>

    <!-- Create/Edit Modal -->
    <CreateRehearsalModal
      v-model="showCreateModal"
      :recital-show-id="recitalShowId"
      :rehearsal-id="selectedRehearsalId"
      @created="handleRehearsalCreated"
      @updated="handleRehearsalUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePermissions } from '~/composables/usePermissions'
import { typography, inputs, getInputClasses } from '~/lib/design-system'
import type { RehearsalWithDetails } from '~/types/tier1-features'

const route = useRoute()
const router = useRouter()
const { can } = usePermissions()

// Props
const recitalShowId = computed(() => route.params.id as string)

// State
const loading = ref(false)
const rehearsals = ref<RehearsalWithDetails[]>([])
const recitalShow = ref<any>(null)
const showCreateModal = ref(false)
const selectedRehearsalId = ref<string | null>(null)

// Filters
const filters = ref({
  type: '',
  status: '',
  dateFrom: '',
  dateTo: '',
})

/**
 * Fetch rehearsals from API
 */
async function fetchRehearsals() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.value.type) params.append('type', filters.value.type)
    if (filters.value.status) params.append('status', filters.value.status)
    if (filters.value.dateFrom) params.append('date_from', filters.value.dateFrom)
    if (filters.value.dateTo) params.append('date_to', filters.value.dateTo)

    const { data, error } = await useFetch(`/api/recitals/${recitalShowId.value}/rehearsals?${params}`)

    if (error.value) {
      throw new Error(error.value.message)
    }

    rehearsals.value = data.value?.rehearsals || []
  } catch (error) {
    console.error('Failed to fetch rehearsals:', error)
    // TODO: Show error toast
  } finally {
    loading.value = false
  }
}

/**
 * Apply filters
 */
function applyFilters() {
  fetchRehearsals()
}

/**
 * Clear filters
 */
function clearFilters() {
  filters.value = {
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  }
  fetchRehearsals()
}

/**
 * Open create modal
 */
function openCreateModal() {
  selectedRehearsalId.value = null
  showCreateModal.value = true
}

/**
 * Edit rehearsal
 */
function editRehearsal(id: string) {
  selectedRehearsalId.value = id
  showCreateModal.value = true
}

/**
 * View rehearsal details
 */
function viewRehearsal(id: string) {
  router.push(`/recitals/${recitalShowId.value}/rehearsals/${id}`)
}

/**
 * Handle rehearsal created
 */
function handleRehearsalCreated() {
  showCreateModal.value = false
  fetchRehearsals()
  // TODO: Show success toast
}

/**
 * Handle rehearsal updated
 */
function handleRehearsalUpdated() {
  showCreateModal.value = false
  fetchRehearsals()
  // TODO: Show success toast
}

/**
 * Get color classes for rehearsal type badge
 */
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    tech: 'bg-blue-100 text-blue-800',
    dress: 'bg-purple-100 text-purple-800',
    stage: 'bg-green-100 text-green-800',
    full: 'bg-orange-100 text-orange-800',
    other: 'bg-gray-100 text-gray-800',
  }
  return colors[type] || colors.other
}

/**
 * Get color classes for status badge
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    'in-progress': 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return colors[status] || colors.scheduled
}

/**
 * Get attendance color based on percentage
 */
function getAttendanceColor(rehearsal: RehearsalWithDetails): string {
  if (!rehearsal.participant_count || !rehearsal.attendance_count) {
    return 'text-gray-600'
  }

  const percentage = (rehearsal.attendance_count / rehearsal.participant_count) * 100

  if (percentage >= 90) return 'text-green-600'
  if (percentage >= 75) return 'text-yellow-600'
  return 'text-red-600'
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Load data on mount
onMounted(() => {
  fetchRehearsals()
})
</script>
