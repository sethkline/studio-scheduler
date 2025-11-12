<template>
  <div class="templates-page">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Lesson Plan Templates</h1>
      <p class="text-gray-600">Create reusable templates for common lesson structures</p>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-3 mb-6">
      <Button
        label="New Template"
        icon="pi pi-plus"
        @click="showDialog = true"
        v-if="can('canManageLessonTemplates')"
      />
      <Button
        label="Back to Lesson Plans"
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        @click="navigateTo('/lesson-planning')"
      />
    </div>

    <!-- Templates Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card v-for="template in templates" :key="template.id" class="template-card">
        <template #header>
          <div class="p-4 border-b">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-semibold text-lg">{{ template.name }}</h3>
                <p class="text-sm text-gray-500">{{ template.description }}</p>
              </div>
              <Tag v-if="template.is_public" severity="info" value="Public" />
            </div>
          </div>
        </template>
        <template #content>
          <div class="space-y-2">
            <div v-if="template.duration" class="flex items-center text-sm text-gray-600">
              <i class="pi pi-clock mr-2"></i>
              {{ template.duration }} minutes
            </div>
            <div class="flex items-center text-sm text-gray-600">
              <i class="pi pi-user mr-2"></i>
              {{ template.teacher?.first_name }} {{ template.teacher?.last_name }}
            </div>
            <div class="flex items-center text-sm text-gray-600">
              <i class="pi pi-bookmark mr-2"></i>
              Used {{ template.use_count }} times
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex gap-2">
            <Button
              label="Use Template"
              size="small"
              @click="useTemplate(template)"
              class="flex-1"
            />
            <Button
              icon="pi pi-pencil"
              size="small"
              severity="info"
              text
              @click="editTemplate(template)"
              v-if="can('canManageLessonTemplates')"
            />
            <Button
              icon="pi pi-trash"
              size="small"
              severity="danger"
              text
              @click="confirmDelete(template)"
              v-if="can('canManageLessonTemplates')"
            />
          </div>
        </template>
      </Card>

      <!-- Empty state -->
      <Card v-if="templates.length === 0 && !loading" class="template-card">
        <template #content>
          <div class="text-center py-8 text-gray-500">
            <i class="pi pi-file text-4xl mb-3"></i>
            <p>No templates found</p>
            <Button
              label="Create Template"
              icon="pi pi-plus"
              size="small"
              class="mt-4"
              @click="showDialog = true"
              v-if="can('canManageLessonTemplates')"
            />
          </div>
        </template>
      </Card>
    </div>

    <!-- Create/Edit Dialog -->
    <Dialog
      v-model:visible="showDialog"
      modal
      :header="editingTemplate ? 'Edit Template' : 'New Template'"
      :style="{ width: '600px' }"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Template Name *</label>
          <InputText
            v-model="form.name"
            placeholder="e.g., Ballet Technique Class"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <Textarea
            v-model="form.description"
            rows="2"
            placeholder="Brief description of this template"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
          <InputNumber
            v-model="form.duration"
            placeholder="60"
            class="w-full"
            :min="15"
            :max="180"
            :step="15"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Warm Up</label>
          <Textarea
            v-model="form.warm_up"
            rows="2"
            placeholder="Standard warm up activities"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Main Activity</label>
          <Textarea
            v-model="form.main_activity"
            rows="3"
            placeholder="Main lesson structure"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Cool Down</label>
          <Textarea
            v-model="form.cool_down"
            rows="2"
            placeholder="Cool down activities"
            class="w-full"
          />
        </div>
        <div class="flex items-center gap-2">
          <Checkbox v-model="form.is_public" binary input-id="public" />
          <label for="public" class="text-sm font-medium text-gray-700">
            Make this template public (other teachers can use it)
          </label>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="showDialog = false" />
        <Button label="Save" @click="saveTemplate" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useLessonPlanStore } from '~/stores/lessonPlanStore'
import { usePermissions } from '~/composables/usePermissions'
import { useAuthStore } from '~/stores/auth'
import { useToast } from 'primevue/usetoast'
import { useLessonPlanningService } from '~/composables/useLessonPlanningService'

definePageMeta({
  middleware: 'teacher',
  layout: 'default'
})

const store = useLessonPlanStore()
const authStore = useAuthStore()
const { can } = usePermissions()
const toast = useToast()
const service = useLessonPlanningService()

const showDialog = ref(false)
const editingTemplate = ref<any>(null)

const form = ref({
  name: '',
  description: '',
  duration: 60,
  warm_up: '',
  main_activity: '',
  cool_down: '',
  is_public: false
})

const templates = computed(() => store.templates)
const loading = computed(() => store.loading.templates)

const fetchTemplates = async () => {
  try {
    await store.fetchTemplates()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to fetch templates',
      life: 3000
    })
  }
}

const editTemplate = (template: any) => {
  editingTemplate.value = template
  form.value = {
    name: template.name,
    description: template.description || '',
    duration: template.duration || 60,
    warm_up: template.warm_up || '',
    main_activity: template.main_activity || '',
    cool_down: template.cool_down || '',
    is_public: template.is_public
  }
  showDialog.value = true
}

const saveTemplate = async () => {
  if (!form.value.name) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Template name is required',
      life: 3000
    })
    return
  }

  try {
    const templateData = {
      ...form.value,
      teacher_id: authStore.profile?.id || ''
    }

    if (editingTemplate.value) {
      await service.updateLessonPlanTemplate(editingTemplate.value.id, templateData)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Template updated successfully',
        life: 3000
      })
    } else {
      await service.createLessonPlanTemplate(templateData)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Template created successfully',
        life: 3000
      })
    }
    showDialog.value = false
    editingTemplate.value = null
    form.value = {
      name: '',
      description: '',
      duration: 60,
      warm_up: '',
      main_activity: '',
      cool_down: '',
      is_public: false
    }
    await fetchTemplates()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save template',
      life: 3000
    })
  }
}

const useTemplate = (template: any) => {
  toast.add({
    severity: 'info',
    summary: 'Info',
    detail: 'Template selected. Create a lesson plan to use it.',
    life: 3000
  })
  // Navigate to lesson plans with template pre-selected
  navigateTo(`/lesson-planning?template=${template.id}`)
}

const confirmDelete = async (template: any) => {
  if (confirm('Are you sure you want to delete this template?')) {
    try {
      await service.deleteLessonPlanTemplate(template.id)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Template deleted',
        life: 3000
      })
      await fetchTemplates()
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete template',
        life: 3000
      })
    }
  }
}

onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped>
.templates-page {
  padding: 1.5rem;
}

.template-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
