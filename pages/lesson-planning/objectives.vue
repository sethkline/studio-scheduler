<template>
  <div class="objectives-page">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Learning Objectives</h1>
      <p class="text-gray-600">Manage curriculum objectives and skills for your classes</p>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-3 mb-6">
      <Button
        label="New Objective"
        icon="pi pi-plus"
        @click="showDialog = true"
        v-if="can('canManageLearningObjectives')"
      />
      <Button
        label="Back to Lesson Plans"
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        @click="navigateTo('/lesson-planning')"
      />
    </div>

    <!-- Objectives Table -->
    <Card>
      <template #content>
        <DataTable
          :value="objectives"
          :loading="loading"
          striped-rows
          responsive-layout="scroll"
        >
          <Column field="title" header="Title" sortable>
            <template #body="slotProps">
              <div>
                <div class="font-semibold">{{ slotProps.data.title }}</div>
                <div class="text-sm text-gray-500">{{ slotProps.data.description }}</div>
              </div>
            </template>
          </Column>
          <Column field="category" header="Category" sortable>
            <template #body="slotProps">
              <Tag v-if="slotProps.data.category">
                {{ formatCategory(slotProps.data.category) }}
              </Tag>
            </template>
          </Column>
          <Column field="skill_level" header="Level" sortable>
            <template #body="slotProps">
              <Tag v-if="slotProps.data.skill_level" severity="info">
                {{ formatLevel(slotProps.data.skill_level) }}
              </Tag>
            </template>
          </Column>
          <Column field="is_active" header="Status">
            <template #body="slotProps">
              <Tag :severity="slotProps.data.is_active ? 'success' : 'danger'">
                {{ slotProps.data.is_active ? 'Active' : 'Inactive' }}
              </Tag>
            </template>
          </Column>
          <Column header="Actions" style="width: 150px">
            <template #body="slotProps">
              <div class="flex gap-2">
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  text
                  rounded
                  severity="info"
                  @click="editObjective(slotProps.data)"
                  v-tooltip.top="'Edit'"
                  v-if="can('canManageLearningObjectives')"
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  text
                  rounded
                  severity="danger"
                  @click="confirmDelete(slotProps.data)"
                  v-tooltip.top="'Delete'"
                  v-if="can('canManageLearningObjectives')"
                />
              </div>
            </template>
          </Column>
          <template #empty>
            <div class="text-center py-8 text-gray-500">
              <i class="pi pi-list text-4xl mb-3"></i>
              <p>No learning objectives found</p>
              <Button
                label="Create Your First Objective"
                icon="pi pi-plus"
                class="mt-4"
                @click="showDialog = true"
                v-if="can('canManageLearningObjectives')"
              />
            </div>
          </template>
        </DataTable>
      </template>
    </Card>

    <!-- Create/Edit Dialog -->
    <Dialog
      v-model:visible="showDialog"
      modal
      :header="editingObjective ? 'Edit Learning Objective' : 'New Learning Objective'"
      :style="{ width: '500px' }"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Title *</label>
          <InputText
            v-model="form.title"
            placeholder="Objective title"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <Textarea
            v-model="form.description"
            rows="3"
            placeholder="Detailed description"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <Select
            v-model="form.category"
            :options="categoryOptions"
            placeholder="Select category"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Skill Level</label>
          <Select
            v-model="form.skill_level"
            :options="levelOptions"
            placeholder="Select level"
            class="w-full"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="showDialog = false" />
        <Button label="Save" @click="saveObjective" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useLessonPlanStore } from '~/stores/lessonPlanStore'
import { usePermissions } from '~/composables/usePermissions'
import { useToast } from 'primevue/usetoast'
import { useLessonPlanningService } from '~/composables/useLessonPlanningService'

definePageMeta({
  middleware: 'teacher',
  layout: 'default'
})

const store = useLessonPlanStore()
const { can } = usePermissions()
const toast = useToast()
const service = useLessonPlanningService()

const showDialog = ref(false)
const editingObjective = ref<any>(null)

const form = ref({
  title: '',
  description: '',
  category: '',
  skill_level: ''
})

const categoryOptions = ['technique', 'choreography', 'musicality', 'performance', 'conditioning', 'theory']
const levelOptions = ['beginner', 'intermediate', 'advanced', 'professional']

const objectives = computed(() => store.learningObjectives)
const loading = computed(() => store.loading.objectives)

const fetchObjectives = async () => {
  try {
    await store.fetchLearningObjectives()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to fetch learning objectives',
      life: 3000
    })
  }
}

const editObjective = (objective: any) => {
  editingObjective.value = objective
  form.value = {
    title: objective.title,
    description: objective.description || '',
    category: objective.category || '',
    skill_level: objective.skill_level || ''
  }
  showDialog.value = true
}

const saveObjective = async () => {
  if (!form.value.title) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Title is required',
      life: 3000
    })
    return
  }

  try {
    if (editingObjective.value) {
      await service.updateLearningObjective(editingObjective.value.id, form.value)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Objective updated successfully',
        life: 3000
      })
    } else {
      await service.createLearningObjective(form.value)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Objective created successfully',
        life: 3000
      })
    }
    showDialog.value = false
    editingObjective.value = null
    form.value = { title: '', description: '', category: '', skill_level: '' }
    await fetchObjectives()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save objective',
      life: 3000
    })
  }
}

const confirmDelete = async (objective: any) => {
  if (confirm('Are you sure you want to delete this objective?')) {
    try {
      await service.deleteLearningObjective(objective.id)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Objective deleted',
        life: 3000
      })
      await fetchObjectives()
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete objective',
        life: 3000
      })
    }
  }
}

const formatCategory = (category: string) => {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

const formatLevel = (level: string) => {
  return level.charAt(0).toUpperCase() + level.slice(1)
}

onMounted(() => {
  fetchObjectives()
})
</script>

<style scoped>
.objectives-page {
  padding: 1.5rem;
}
</style>
