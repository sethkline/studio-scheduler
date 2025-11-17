<template>
  <AppModal
    v-model="isOpen"
    title="Task Templates"
    size="lg"
    @close="handleClose"
  >
    <div class="space-y-4">
      <p :class="typography.body.base" class="text-gray-700">
        Use pre-built task templates to quickly create multiple related tasks for common recital preparation workflows.
      </p>

      <!-- Loading state -->
      <div v-if="loading" class="py-8 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p :class="typography.body.small" class="mt-4 text-gray-500">Loading templates...</p>
      </div>

      <!-- Template List -->
      <div v-else class="space-y-3">
        <AppCard
          v-for="template in templates"
          :key="template.id"
          class="hover:shadow-md transition-shadow cursor-pointer"
          @click="selectedTemplate = template"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 :class="typography.body.base" class="font-medium">
                {{ template.name }}
              </h3>
              <p v-if="template.description" :class="typography.body.small" class="text-gray-600 mt-1">
                {{ template.description }}
              </p>
              <div class="flex items-center gap-3 mt-2">
                <span :class="typography.body.small" class="text-gray-500">
                  {{ template.items?.length || 0 }} tasks
                </span>
                <span
                  :class="[
                    'inline-flex items-center px-2 py-0.5 rounded text-xs',
                    getPriorityColor(template.priority)
                  ]"
                >
                  {{ template.priority }}
                </span>
              </div>
            </div>

            <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </AppCard>

        <!-- Empty State -->
        <AppEmptyState
          v-if="templates.length === 0"
          heading="No templates available"
          description="Contact your studio administrator to create task templates."
        >
          <template #icon>
            <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </template>
        </AppEmptyState>
      </div>

      <!-- Template Detail View -->
      <div v-if="selectedTemplate" class="border-t border-gray-200 pt-4 mt-4">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 :class="typography.heading.h4">{{ selectedTemplate.name }}</h3>
            <p :class="typography.body.small" class="text-gray-600 mt-1">
              {{ selectedTemplate.description }}
            </p>
          </div>
          <AppButton
            variant="ghost"
            size="sm"
            @click="selectedTemplate = null"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </AppButton>
        </div>

        <!-- Task Items Preview -->
        <div class="space-y-2 mb-4 max-h-64 overflow-y-auto">
          <div
            v-for="(item, index) in selectedTemplate.items"
            :key="item.id"
            class="flex items-start gap-2 p-2 bg-gray-50 rounded"
          >
            <span :class="typography.body.small" class="text-gray-500 font-medium">
              {{ index + 1 }}.
            </span>
            <div class="flex-1">
              <p :class="typography.body.small" class="font-medium">{{ item.title }}</p>
              <p v-if="item.description" :class="typography.body.small" class="text-gray-600 text-xs">
                {{ item.description }}
              </p>
            </div>
          </div>
        </div>

        <!-- Apply Template Form -->
        <div class="space-y-3">
          <div>
            <AppInput
              v-model="showDate"
              label="Show Date"
              type="date"
              required
              help="Used to calculate task due dates"
            />
          </div>

          <AppAlert variant="info">
            <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            This will create {{ selectedTemplate.items?.length || 0 }} new tasks for your recital.
          </AppAlert>

          <div class="flex justify-end gap-3">
            <AppButton
              variant="secondary"
              @click="selectedTemplate = null"
              :disabled="applying"
            >
              Cancel
            </AppButton>
            <AppButton
              variant="primary"
              @click="applyTemplate"
              :loading="applying"
              :disabled="!showDate"
            >
              Apply Template
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { typography } from '~/lib/design-system'

interface Props {
  modelValue: boolean
  recitalShowId: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'applied'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// State
const loading = ref(false)
const applying = ref(false)
const templates = ref<any[]>([])
const selectedTemplate = ref<any>(null)
const showDate = ref('')

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

/**
 * Fetch templates
 */
async function fetchTemplates() {
  loading.value = true
  try {
    const { data, error } = await useFetch('/api/task-templates')

    if (error.value) {
      throw new Error(error.value.message)
    }

    templates.value = data.value?.templates || []
  } catch (error) {
    console.error('Failed to fetch templates:', error)
  } finally {
    loading.value = false
  }
}

/**
 * Apply template
 */
async function applyTemplate() {
  if (!selectedTemplate.value || !showDate.value) return

  applying.value = true
  try {
    const { error } = await useFetch(`/api/recitals/${props.recitalShowId}/tasks/from-template`, {
      method: 'POST',
      body: {
        template_id: selectedTemplate.value.id,
        show_date: showDate.value,
      },
    })

    if (error.value) {
      throw new Error(error.value.message)
    }

    emit('applied')
    handleClose()
  } catch (error: any) {
    console.error('Failed to apply template:', error)
    alert(error.message || 'Failed to apply template')
  } finally {
    applying.value = false
  }
}

/**
 * Get priority color
 */
function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  }
  return colors[priority] || colors.medium
}

/**
 * Handle close
 */
function handleClose() {
  selectedTemplate.value = null
  showDate.value = ''
  emit('update:modelValue', false)
}

// Watch for modal open
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    fetchTemplates()
  }
})
</script>
