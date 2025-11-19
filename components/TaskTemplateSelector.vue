<template>
  <Dialog
    v-model:visible="visible"
    header="Add Tasks from Template"
    :modal="true"
    :style="{ width: '800px' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="space-y-4">
      <p class="text-gray-600">
        Choose a pre-built task template to quickly add common recital preparation tasks.
        Due dates will be automatically calculated based on your show date.
      </p>

      <div v-if="loading" class="text-center py-8">
        <ProgressSpinner style="width: 50px; height: 50px" />
      </div>

      <div v-else-if="templates.length === 0" class="text-center py-8 text-gray-500">
        <i class="pi pi-inbox text-4xl mb-3"></i>
        <p>No templates available</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="template in templates"
          :key="template.id"
          class="template-card"
          :class="{ 'template-card-selected': selectedTemplate?.id === template.id }"
          @click="selectTemplate(template)"
        >
          <div class="flex items-start justify-between mb-2">
            <h4 class="font-semibold text-gray-900">{{ template.name }}</h4>
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              :class="
                selectedTemplate?.id === template.id
                  ? 'border-blue-600 bg-blue-600'
                  : 'border-gray-300'
              "
            >
              <i v-if="selectedTemplate?.id === template.id" class="pi pi-check text-white text-xs"></i>
            </div>
          </div>

          <p class="text-sm text-gray-600 mb-3">{{ template.description }}</p>

          <div class="flex items-center gap-2 text-xs text-gray-500">
            <i class="pi pi-calendar"></i>
            <span>{{ getTimelineText(template.timeline_offset_days) }}</span>
          </div>

          <div class="mt-3 pt-3 border-t border-gray-200">
            <p class="text-xs text-gray-600 mb-1">{{ getTaskCount(template.tasks) }} tasks</p>
          </div>
        </div>
      </div>

      <div v-if="selectedTemplate" class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h5 class="font-semibold text-gray-900 mb-2">Preview Tasks:</h5>
        <ul class="text-sm space-y-1">
          <li v-for="(task, index) in getTemplateTasksPreview()" :key="index" class="text-gray-700">
            • {{ task.title }}
          </li>
        </ul>
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" icon="pi pi-times" text @click="visible = false" />
      <Button
        label="Add Tasks"
        icon="pi pi-check"
        @click="applyTemplate"
        :disabled="!selectedTemplate"
        :loading="applying"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
interface Template {
  id: string
  name: string
  description: string
  timeline_offset_days: number
  tasks: any[]
}

interface Props {
  visible: boolean
  recitalId: string
  showDate?: string
}

const props = defineProps<Props>()
const emit = defineEmits(['update:visible', 'templateApplied'])

const toast = useToast()

const templates = ref<Template[]>([])
const selectedTemplate = ref<Template | null>(null)
const loading = ref(false)
const applying = ref(false)

const loadTemplates = async () => {
  loading.value = true

  try {
    const { data } = await useFetch('/api/recital-tasks/templates')
    templates.value = (data.value as Template[]) || []
  } catch (error) {
    console.error('Error loading templates:', error)
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load templates', life: 3000 })
  } finally {
    loading.value = false
  }
}

const selectTemplate = (template: Template) => {
  selectedTemplate.value = template
}

const getTimelineText = (offsetDays: number) => {
  if (offsetDays === 0) return 'Day of show'
  if (offsetDays > 0) return `${offsetDays} days after show`
  return `${Math.abs(offsetDays)} days before show`
}

const getTaskCount = (tasks: any) => {
  return Array.isArray(tasks) ? tasks.length : 0
}

const getTemplateTasksPreview = () => {
  if (!selectedTemplate.value?.tasks) return []
  return Array.isArray(selectedTemplate.value.tasks)
    ? selectedTemplate.value.tasks.slice(0, 5)
    : []
}

const applyTemplate = async () => {
  if (!selectedTemplate.value) return

  applying.value = true

  try {
    await $fetch('/api/recital-tasks/apply-template', {
      method: 'POST',
      body: {
        recitalId: props.recitalId,
        templateId: selectedTemplate.value.id,
        showDate: props.showDate || new Date().toISOString()
      }
    })

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Tasks added from template',
      life: 3000
    })

    emit('templateApplied')
    emit('update:visible', false)
    selectedTemplate.value = null
  } catch (error) {
    console.error('Error applying template:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to apply template',
      life: 3000
    })
  } finally {
    applying.value = false
  }
}

watch(
  () => props.visible,
  (newVal) => {
    if (newVal && templates.value.length === 0) {
      loadTemplates()
    }
  }
)
</script>

<style scoped>
.template-card {
  @apply p-4 border-2 border-gray-200 rounded-lg cursor-pointer transition-all hover:border-gray-300 hover:shadow-md;
}

.template-card-selected {
  @apply border-blue-600 bg-blue-50;
}
</style>
