<template>
  <div class="space-y-4">
    <!-- Quick Preset Buttons -->
    <div class="flex flex-wrap gap-2">
      <Button
        v-for="(range, label) in presets"
        :key="label"
        :label="label"
        :outlined="selectedPreset !== label"
        size="small"
        @click="selectPreset(label as string)"
        class="text-sm"
      />
      <Button
        label="Custom"
        :outlined="selectedPreset !== 'Custom'"
        size="small"
        @click="showCustom = !showCustom"
        class="text-sm"
      />
    </div>

    <!-- Custom Date Range Inputs -->
    <div v-if="showCustom" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="start-date" class="block text-sm font-medium text-gray-700 mb-2">
          Start Date
        </label>
        <DatePicker
          id="start-date"
          v-model="customStartDate"
          dateFormat="yy-mm-dd"
          :maxDate="customEndDate || new Date()"
          showIcon
          placeholder="Select start date"
          class="w-full"
        />
      </div>
      <div>
        <label for="end-date" class="block text-sm font-medium text-gray-700 mb-2">
          End Date
        </label>
        <DatePicker
          id="end-date"
          v-model="customEndDate"
          dateFormat="yy-mm-dd"
          :minDate="customStartDate"
          :maxDate="new Date()"
          showIcon
          placeholder="Select end date"
          class="w-full"
        />
      </div>
    </div>

    <!-- Apply Button for Custom Range -->
    <div v-if="showCustom" class="flex justify-end">
      <Button
        label="Apply Custom Range"
        icon="pi pi-check"
        @click="applyCustomRange"
        :disabled="!customStartDate || !customEndDate"
      />
    </div>

    <!-- Selected Range Display -->
    <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
      <strong>Selected Range:</strong> {{ formattedDateRange }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'

interface DateRange {
  startDate: string
  endDate: string
}

interface Props {
  modelValue?: DateRange
}

interface Emits {
  (e: 'update:modelValue', value: DateRange): void
  (e: 'change', value: DateRange): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// State
const selectedPreset = ref<string>('Last 12 Months')
const showCustom = ref(false)
const customStartDate = ref<Date | null>(null)
const customEndDate = ref<Date | null>(null)

// Date range presets
const presets = computed(() => {
  const today = new Date()
  return {
    'Last 30 Days': {
      startDate: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)),
      endDate: formatDate(today)
    },
    'Last 90 Days': {
      startDate: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90)),
      endDate: formatDate(today)
    },
    'Last 6 Months': {
      startDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 6, 1)),
      endDate: formatDate(today)
    },
    'Last 12 Months': {
      startDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 12, 1)),
      endDate: formatDate(today)
    },
    'This Month': {
      startDate: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate: formatDate(today)
    },
    'This Quarter': {
      startDate: formatDate(new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)),
      endDate: formatDate(today)
    },
    'This Year': {
      startDate: formatDate(new Date(today.getFullYear(), 0, 1)),
      endDate: formatDate(today)
    },
    'Last Year': {
      startDate: formatDate(new Date(today.getFullYear() - 1, 0, 1)),
      endDate: formatDate(new Date(today.getFullYear() - 1, 11, 31))
    }
  }
})

// Current date range
const currentRange = ref<DateRange>(presets.value['Last 12 Months'])

// Formatted date range for display
const formattedDateRange = computed(() => {
  if (!currentRange.value) return 'No range selected'
  const start = new Date(currentRange.value.startDate)
  const end = new Date(currentRange.value.endDate)
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
  return `${formatter.format(start)} - ${formatter.format(end)}`
})

// Initialize with default preset
if (!props.modelValue) {
  emit('update:modelValue', currentRange.value)
  emit('change', currentRange.value)
}

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    currentRange.value = newValue
  }
}, { immediate: true })

// Methods
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function selectPreset(label: string) {
  selectedPreset.value = label
  showCustom.value = false
  currentRange.value = presets.value[label]
  emit('update:modelValue', currentRange.value)
  emit('change', currentRange.value)
}

function applyCustomRange() {
  if (!customStartDate.value || !customEndDate.value) return

  selectedPreset.value = 'Custom'
  currentRange.value = {
    startDate: formatDate(customStartDate.value),
    endDate: formatDate(customEndDate.value)
  }
  emit('update:modelValue', currentRange.value)
  emit('change', currentRange.value)
  showCustom.value = false
}
</script>

<style scoped>
/* Date picker custom styles */
:deep(.p-datepicker) {
  font-size: 0.875rem;
}
</style>
