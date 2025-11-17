<script setup lang="ts">
import type { OrderFilters } from '~/types'

/**
 * Order list filters component
 * Emits filter changes to parent
 */

interface Props {
  modelValue: OrderFilters
  shows?: Array<{ id: string; title: string; show_date: string }>
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  shows: () => [],
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [filters: OrderFilters]
  'apply': []
  'reset': []
}>()

// Local filter state
const localFilters = ref<OrderFilters>({ ...props.modelValue })

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    localFilters.value = { ...newValue }
  },
  { deep: true }
)

// Status options
const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Failed', value: 'failed' },
  { label: 'Refunded', value: 'refunded' },
  { label: 'Cancelled', value: 'cancelled' }
]

// Show options (computed from props)
const showOptions = computed(() => {
  return [
    { label: 'All Shows', value: null },
    ...props.shows.map((show) => ({
      label: `${show.title} - ${formatDate(show.show_date)}`,
      value: show.id
    }))
  ]
})

// Apply filters
const applyFilters = () => {
  emit('update:modelValue', { ...localFilters.value })
  emit('apply')
}

// Reset filters
const resetFilters = () => {
  localFilters.value = {
    status: 'all',
    show_id: undefined,
    date_from: undefined,
    date_to: undefined,
    search: undefined,
    page: 1
  }
  emit('update:modelValue', { ...localFilters.value })
  emit('reset')
}

// Format date for display
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return (
    (localFilters.value.status && localFilters.value.status !== 'all') ||
    localFilters.value.show_id ||
    localFilters.value.date_from ||
    localFilters.value.date_to ||
    localFilters.value.search
  )
})
</script>

<template>
  <Card class="mb-6">
    <template #content>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Search -->
        <div class="flex flex-col">
          <label class="text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <InputText
            v-model="localFilters.search"
            placeholder="Name, email, or order #"
            class="w-full"
            :disabled="loading"
            @keyup.enter="applyFilters"
          />
        </div>

        <!-- Show Filter -->
        <div class="flex flex-col">
          <label class="text-sm font-medium text-gray-700 mb-2">
            Show
          </label>
          <Dropdown
            v-model="localFilters.show_id"
            :options="showOptions"
            option-label="label"
            option-value="value"
            placeholder="All Shows"
            class="w-full"
            :disabled="loading"
            show-clear
          />
        </div>

        <!-- Status Filter -->
        <div class="flex flex-col">
          <label class="text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <Dropdown
            v-model="localFilters.status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            placeholder="All Statuses"
            class="w-full"
            :disabled="loading"
          />
        </div>

        <!-- Date Range -->
        <div class="flex flex-col">
          <label class="text-sm font-medium text-gray-700 mb-2">
            Date From
          </label>
          <Calendar
            v-model="localFilters.date_from"
            date-format="yy-mm-dd"
            placeholder="Start date"
            class="w-full"
            :disabled="loading"
            show-icon
          />
        </div>

        <div class="flex flex-col">
          <label class="text-sm font-medium text-gray-700 mb-2">
            Date To
          </label>
          <Calendar
            v-model="localFilters.date_to"
            date-format="yy-mm-dd"
            placeholder="End date"
            class="w-full"
            :disabled="loading"
            show-icon
          />
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex justify-end gap-2 mt-4">
        <Button
          label="Reset"
          severity="secondary"
          outlined
          :disabled="!hasActiveFilters || loading"
          @click="resetFilters"
        />
        <Button
          label="Apply Filters"
          :loading="loading"
          @click="applyFilters"
        />
      </div>

      <!-- Active filters indicator -->
      <div v-if="hasActiveFilters && !loading" class="mt-3 flex items-center gap-2 text-sm text-gray-600">
        <i class="pi pi-filter text-primary-500" />
        <span>Filters active</span>
      </div>
    </template>
  </Card>
</template>
