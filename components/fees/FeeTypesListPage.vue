<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <!-- Page header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 :class="typography.heading.h1">Fee Types</h1>
          <p :class="typography.body.small" class="mt-1">
            Configure fee types for {{ recitalShow?.name || 'this recital' }}
          </p>
        </div>

        <AppButton
          v-if="can('canManageFinances')"
          variant="primary"
          @click="openCreateModal"
        >
          <template #icon>
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </template>
          Create Fee Type
        </AppButton>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <AppCard>
        <div class="text-center">
          <p :class="typography.body.small" class="text-gray-500">Total Fee Types</p>
          <p :class="typography.heading.h2" class="mt-1">{{ feeTypes.length }}</p>
        </div>
      </AppCard>

      <AppCard>
        <div class="text-center">
          <p :class="typography.body.small" class="text-gray-500">Active Fees</p>
          <p :class="typography.heading.h2" class="mt-1 text-green-600">
            {{ feeTypes.filter(f => f.is_active).length }}
          </p>
        </div>
      </AppCard>

      <AppCard>
        <div class="text-center">
          <p :class="typography.body.small" class="text-gray-500">Total Assigned</p>
          <p :class="typography.heading.h2" class="mt-1">{{ totalAssignments }}</p>
        </div>
      </AppCard>

      <AppCard>
        <div class="text-center">
          <p :class="typography.body.small" class="text-gray-500">Total Collected</p>
          <p :class="typography.heading.h2" class="mt-1 text-green-600">
            {{ formatCurrency(totalCollected) }}
          </p>
        </div>
      </AppCard>
    </div>

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
      v-else-if="!loading && feeTypes.length === 0"
      heading="No fee types configured"
      description="Create fee types to start collecting payments for this recital"
    >
      <template #icon>
        <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </template>
      <template #action>
        <AppButton
          v-if="can('canManageFinances')"
          variant="primary"
          @click="openCreateModal"
        >
          Create Fee Type
        </AppButton>
      </template>
    </AppEmptyState>

    <!-- Fee types list -->
    <div v-else class="space-y-4">
      <AppCard
        v-for="feeType in feeTypes"
        :key="feeType.id"
        hoverable
        clickable
        @click="viewFeeType(feeType.id)"
      >
        <div class="flex items-start justify-between">
          <!-- Fee info -->
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <!-- Type badge -->
              <span
                :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  getTypeColor(feeType.fee_type)
                ]"
              >
                {{ feeType.fee_type }}
              </span>

              <!-- Active badge -->
              <span
                v-if="feeType.is_active"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
              >
                Active
              </span>

              <!-- Required badge -->
              <span
                v-if="feeType.is_required"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
              >
                Required
              </span>
            </div>

            <h3 :class="typography.heading.h3" class="mt-2">
              {{ feeType.name }}
            </h3>

            <p v-if="feeType.description" :class="typography.body.small" class="text-gray-600 mt-1">
              {{ feeType.description }}
            </p>

            <div class="mt-3 flex flex-wrap gap-4 text-sm">
              <!-- Default amount -->
              <div class="flex items-center gap-1">
                <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="font-medium">{{ formatCurrency(feeType.default_amount_in_cents) }}</span>
              </div>

              <!-- Early bird pricing -->
              <div v-if="feeType.early_bird_amount_in_cents" class="flex items-center gap-1 text-green-600">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Early bird: {{ formatCurrency(feeType.early_bird_amount_in_cents) }}</span>
                <span class="text-xs text-gray-500">
                  (by {{ formatDate(feeType.early_bird_deadline) }})
                </span>
              </div>

              <!-- Due date -->
              <div v-if="feeType.due_date" class="flex items-center gap-1">
                <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Due: {{ formatDate(feeType.due_date) }}</span>
              </div>
            </div>

            <!-- Statistics -->
            <div class="mt-3 flex items-center gap-6 text-sm">
              <div>
                <span class="font-medium">Assigned:</span>
                <span class="text-gray-600 ml-1">{{ feeType.assigned_count || 0 }} students</span>
              </div>
              <div>
                <span class="font-medium">Collected:</span>
                <span class="text-green-600 ml-1">{{ formatCurrency(feeType.collected_amount || 0) }}</span>
              </div>
              <div>
                <span class="font-medium">Outstanding:</span>
                <span class="text-orange-600 ml-1">{{ formatCurrency(feeType.outstanding_amount || 0) }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-start gap-2">
            <AppButton
              v-if="can('canManageFinances')"
              size="sm"
              variant="ghost"
              @click.stop="editFeeType(feeType.id)"
            >
              <template #icon>
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </template>
            </AppButton>
            <AppButton
              size="sm"
              variant="primary"
              @click.stop="assignFees(feeType.id)"
            >
              Assign Fees
            </AppButton>
          </div>
        </div>
      </AppCard>
    </div>

    <!-- Create/Edit Modal -->
    <CreateFeeTypeModal
      v-model="showCreateModal"
      :recital-show-id="recitalShowId"
      :fee-type-id="selectedFeeTypeId"
      @created="handleFeeTypeCreated"
      @updated="handleFeeTypeUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePermissions } from '~/composables/usePermissions'
import { typography } from '~/lib/design-system'
import type { FeeTypeWithAssignments } from '~/types/tier1-features'

const route = useRoute()
const router = useRouter()
const { can } = usePermissions()

// Props
const recitalShowId = computed(() => route.params.id as string)

// State
const loading = ref(false)
const feeTypes = ref<FeeTypeWithAssignments[]>([])
const recitalShow = ref<any>(null)
const showCreateModal = ref(false)
const selectedFeeTypeId = ref<string | null>(null)

// Computed
const totalAssignments = computed(() =>
  feeTypes.value.reduce((sum, f) => sum + (f.assigned_count || 0), 0)
)

const totalCollected = computed(() =>
  feeTypes.value.reduce((sum, f) => sum + (f.collected_amount || 0), 0)
)

/**
 * Fetch fee types from API
 */
async function fetchFeeTypes() {
  loading.value = true
  try {
    const { data, error } = await useFetch(`/api/recitals/${recitalShowId.value}/fee-types`)

    if (error.value) {
      throw new Error(error.value.message)
    }

    feeTypes.value = data.value?.feeTypes || []
  } catch (error) {
    console.error('Failed to fetch fee types:', error)
  } finally {
    loading.value = false
  }
}

/**
 * Open create modal
 */
function openCreateModal() {
  selectedFeeTypeId.value = null
  showCreateModal.value = true
}

/**
 * Edit fee type
 */
function editFeeType(id: string) {
  selectedFeeTypeId.value = id
  showCreateModal.value = true
}

/**
 * View fee type details
 */
function viewFeeType(id: string) {
  router.push(`/recitals/${recitalShowId.value}/fees/types/${id}`)
}

/**
 * Assign fees to students
 */
function assignFees(feeTypeId: string) {
  router.push(`/recitals/${recitalShowId.value}/fees/assign?feeType=${feeTypeId}`)
}

/**
 * Handle fee type created
 */
function handleFeeTypeCreated() {
  showCreateModal.value = false
  fetchFeeTypes()
}

/**
 * Handle fee type updated
 */
function handleFeeTypeUpdated() {
  showCreateModal.value = false
  fetchFeeTypes()
}

/**
 * Get color classes for fee type badge
 */
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    participation: 'bg-blue-100 text-blue-800',
    costume: 'bg-purple-100 text-purple-800',
    makeup: 'bg-pink-100 text-pink-800',
    props: 'bg-green-100 text-green-800',
    ticket: 'bg-orange-100 text-orange-800',
    photo: 'bg-indigo-100 text-indigo-800',
    video: 'bg-red-100 text-red-800',
    other: 'bg-gray-100 text-gray-800',
  }
  return colors[type] || colors.other
}

/**
 * Format currency
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Load data on mount
onMounted(() => {
  fetchFeeTypes()
})
</script>
