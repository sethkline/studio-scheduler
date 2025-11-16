<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <!-- Loading state -->
    <div v-if="loading" class="animate-pulse">
      <div class="h-8 bg-gray-200 rounded w-1/3 mb-6" />
      <div class="h-64 bg-gray-200 rounded mb-6" />
    </div>

    <!-- Loaded content -->
    <div v-else-if="rehearsal">
      <!-- Breadcrumb -->
      <nav class="flex mb-4" aria-label="Breadcrumb">
        <ol class="inline-flex items-center space-x-1 md:space-x-3">
          <li>
            <NuxtLink
              :to="`/recitals/${recitalShowId}`"
              class="text-gray-500 hover:text-gray-700"
            >
              Recital
            </NuxtLink>
          </li>
          <li>
            <span class="mx-2 text-gray-400">/</span>
          </li>
          <li>
            <NuxtLink
              :to="`/recitals/${recitalShowId}/rehearsals`"
              class="text-gray-500 hover:text-gray-700"
            >
              Rehearsals
            </NuxtLink>
          </li>
          <li>
            <span class="mx-2 text-gray-400">/</span>
          </li>
          <li aria-current="page">
            <span class="text-gray-900 font-medium">{{ rehearsal.name }}</span>
          </li>
        </ol>
      </nav>

      <!-- Page header -->
      <div class="mb-6">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
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

            <h1 :class="typography.heading.h1">{{ rehearsal.name }}</h1>

            <div class="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
              <!-- Date -->
              <div class="flex items-center gap-1">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ formatDate(rehearsal.date) }}
              </div>

              <!-- Time -->
              <div class="flex items-center gap-1">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ rehearsal.start_time }} - {{ rehearsal.end_time }}
                <span v-if="rehearsal.call_time" class="text-xs">(Call time: {{ rehearsal.call_time }})</span>
              </div>

              <!-- Location -->
              <div v-if="rehearsal.location" class="flex items-center gap-1">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {{ rehearsal.location }}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div v-if="can('canManageRehearsals')" class="flex gap-2">
            <AppButton
              variant="secondary"
              @click="editRehearsal"
            >
              Edit Rehearsal
            </AppButton>
            <AppButton
              variant="danger"
              @click="showDeleteConfirm = true"
            >
              Delete
            </AppButton>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 mb-6">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="[
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
            ]"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
            <span
              v-if="tab.count !== undefined"
              :class="[
                activeTab === tab.id
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-gray-100 text-gray-900',
                'ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium'
              ]"
            >
              {{ tab.count }}
            </span>
          </button>
        </nav>
      </div>

      <!-- Tab content -->
      <div>
        <!-- Details tab -->
        <div v-if="activeTab === 'details'">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Description -->
            <AppCard title="Description">
              <p v-if="rehearsal.description" :class="typography.body.base">
                {{ rehearsal.description }}
              </p>
              <p v-else :class="typography.body.small" class="text-gray-400">
                No description provided
              </p>
            </AppCard>

            <!-- Requirements -->
            <AppCard title="Requirements">
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <svg
                    :class="[
                      'h-5 w-5',
                      rehearsal.requires_costumes ? 'text-green-500' : 'text-gray-300'
                    ]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span :class="rehearsal.requires_costumes ? 'text-gray-900' : 'text-gray-400'">
                    Costumes required
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <svg
                    :class="[
                      'h-5 w-5',
                      rehearsal.requires_props ? 'text-green-500' : 'text-gray-300'
                    ]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span :class="rehearsal.requires_props ? 'text-gray-900' : 'text-gray-400'">
                    Props required
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <svg
                    :class="[
                      'h-5 w-5',
                      rehearsal.requires_tech ? 'text-green-500' : 'text-gray-300'
                    ]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span :class="rehearsal.requires_tech ? 'text-gray-900' : 'text-gray-400'">
                    Technical crew needed
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <svg
                    :class="[
                      'h-5 w-5',
                      rehearsal.parents_allowed ? 'text-green-500' : 'text-gray-300'
                    ]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span :class="rehearsal.parents_allowed ? 'text-gray-900' : 'text-gray-400'">
                    Parents allowed to watch
                  </span>
                </div>
              </div>
            </AppCard>

            <!-- Notes -->
            <AppCard v-if="rehearsal.notes" title="Internal Notes" class="md:col-span-2">
              <p :class="typography.body.base" class="whitespace-pre-wrap">
                {{ rehearsal.notes }}
              </p>
            </AppCard>
          </div>
        </div>

        <!-- Attendance tab -->
        <div v-else-if="activeTab === 'attendance'">
          <RehearsalAttendanceTracker
            :rehearsal-id="rehearsal.id"
            :can-edit="can('canManageRehearsals')"
          />
        </div>

        <!-- Resources tab -->
        <div v-else-if="activeTab === 'resources'">
          <RehearsalResourceManager
            :rehearsal-id="rehearsal.id"
            :can-edit="can('canManageRehearsals')"
          />
        </div>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <AppModal
      v-model="showDeleteConfirm"
      title="Delete Rehearsal"
      size="sm"
    >
      <p :class="typography.body.base">
        Are you sure you want to delete "{{ rehearsal?.name }}"? This will also delete all attendance records and resources. This action cannot be undone.
      </p>

      <template #footer>
        <AppButton
          variant="secondary"
          @click="showDeleteConfirm = false"
        >
          Cancel
        </AppButton>
        <AppButton
          variant="danger"
          :loading="deleting"
          @click="confirmDelete"
        >
          Delete Rehearsal
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePermissions } from '~/composables/usePermissions'
import { typography } from '~/lib/design-system'
import type { RehearsalWithDetails } from '~/types/tier1-features'

const route = useRoute()
const router = useRouter()
const { can } = usePermissions()

// Props from route
const rehearsalId = computed(() => route.params.rehearsalId as string)
const recitalShowId = computed(() => route.params.id as string)

// State
const loading = ref(false)
const deleting = ref(false)
const rehearsal = ref<RehearsalWithDetails | null>(null)
const activeTab = ref('details')
const showDeleteConfirm = ref(false)

// Tabs configuration
const tabs = computed(() => [
  { id: 'details', label: 'Details' },
  {
    id: 'attendance',
    label: 'Attendance',
    count: rehearsal.value?.attendance_count || 0,
  },
  {
    id: 'resources',
    label: 'Resources',
    count: rehearsal.value?.resources?.length || 0,
  },
])

/**
 * Fetch rehearsal details
 */
async function fetchRehearsal() {
  loading.value = true
  try {
    const { data, error } = await useFetch(`/api/rehearsals/${rehearsalId.value}`)

    if (error.value) {
      throw new Error(error.value.message)
    }

    rehearsal.value = data.value
  } catch (error) {
    console.error('Failed to fetch rehearsal:', error)
    // TODO: Show error toast and redirect
    router.push(`/recitals/${recitalShowId.value}/rehearsals`)
  } finally {
    loading.value = false
  }
}

/**
 * Edit rehearsal
 */
function editRehearsal() {
  // TODO: Open edit modal or navigate to edit page
  console.log('Edit rehearsal')
}

/**
 * Confirm delete
 */
async function confirmDelete() {
  deleting.value = true
  try {
    const { error } = await useFetch(`/api/rehearsals/${rehearsalId.value}`, {
      method: 'DELETE',
    })

    if (error.value) {
      throw new Error(error.value.message)
    }

    // TODO: Show success toast
    router.push(`/recitals/${recitalShowId.value}/rehearsals`)
  } catch (error: any) {
    console.error('Failed to delete rehearsal:', error)
    // TODO: Show error toast
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
  }
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
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

// Load data on mount
onMounted(() => {
  fetchRehearsal()
})
</script>
