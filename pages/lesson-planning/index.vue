<template>
  <div class="lesson-planning-page">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Lesson Planning</h1>
      <p class="text-gray-600">Plan, organize, and track your dance class lessons</p>
    </div>

    <!-- Action Buttons -->
    <div class="flex flex-wrap gap-3 mb-6">
      <Button
        label="New Lesson Plan"
        icon="pi pi-plus"
        @click="showCreateDialog = true"
        v-if="can('canManageLessonPlans')"
      />
      <Button
        label="From Template"
        icon="pi pi-file"
        severity="secondary"
        @click="navigateTo('/lesson-planning/templates')"
        v-if="can('canManageLessonTemplates')"
      />
      <Button
        label="Learning Objectives"
        icon="pi pi-list"
        severity="secondary"
        @click="navigateTo('/lesson-planning/objectives')"
        v-if="can('canViewLearningObjectives')"
      />
      <Button
        label="Show Archived"
        icon="pi pi-archive"
        :severity="showArchived ? 'info' : 'secondary'"
        text
        @click="toggleArchived"
      />
    </div>

    <!-- Filters -->
    <Card class="mb-6">
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <Select
              v-model="filters.status"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              placeholder="All Statuses"
              class="w-full"
              @change="applyFilters"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Date From</label>
            <DatePicker
              v-model="filters.dateFrom"
              placeholder="Start Date"
              class="w-full"
              @update:model-value="applyFilters"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Date To</label>
            <DatePicker
              v-model="filters.dateTo"
              placeholder="End Date"
              class="w-full"
              @update:model-value="applyFilters"
            />
          </div>
          <div class="flex items-end">
            <Button
              label="Clear Filters"
              icon="pi pi-filter-slash"
              text
              @click="clearFilters"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Lesson Plans Table -->
    <Card>
      <template #content>
        <DataTable
          :value="lessonPlans"
          :loading="loading"
          paginator
          :rows="20"
          :total-records="pagination.totalItems"
          lazy
          @page="onPage"
          striped-rows
          responsive-layout="scroll"
        >
          <Column field="lesson_date" header="Date" sortable>
            <template #body="slotProps">
              {{ formatDate(slotProps.data.lesson_date) }}
            </template>
          </Column>
          <Column field="title" header="Title" sortable>
            <template #body="slotProps">
              <div>
                <div class="font-semibold">{{ slotProps.data.title }}</div>
                <div class="text-sm text-gray-500">
                  {{ slotProps.data.class_instance?.class_name }}
                </div>
              </div>
            </template>
          </Column>
          <Column field="duration" header="Duration">
            <template #body="slotProps">
              {{ slotProps.data.duration }} min
            </template>
          </Column>
          <Column field="status" header="Status">
            <template #body="slotProps">
              <Tag :severity="getStatusSeverity(slotProps.data.status)">
                {{ formatStatus(slotProps.data.status) }}
              </Tag>
            </template>
          </Column>
          <Column header="Actions" style="width: 200px">
            <template #body="slotProps">
              <div class="flex gap-2">
                <Button
                  icon="pi pi-eye"
                  size="small"
                  text
                  rounded
                  @click="viewLessonPlan(slotProps.data.id)"
                  v-tooltip.top="'View'"
                />
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  text
                  rounded
                  severity="info"
                  @click="editLessonPlan(slotProps.data.id)"
                  v-tooltip.top="'Edit'"
                  v-if="can('canManageLessonPlans')"
                />
                <Button
                  icon="pi pi-check"
                  size="small"
                  text
                  rounded
                  severity="success"
                  @click="completeLessonPlan(slotProps.data)"
                  v-tooltip.top="'Mark Complete'"
                  v-if="slotProps.data.status !== 'completed' && can('canManageLessonPlans')"
                />
                <Button
                  icon="pi pi-archive"
                  size="small"
                  text
                  rounded
                  severity="warning"
                  @click="archiveLessonPlan(slotProps.data)"
                  v-tooltip.top="'Archive'"
                  v-if="!slotProps.data.is_archived && can('canManageLessonPlans')"
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  text
                  rounded
                  severity="danger"
                  @click="confirmDelete(slotProps.data)"
                  v-tooltip.top="'Delete'"
                  v-if="can('canManageLessonPlans')"
                />
              </div>
            </template>
          </Column>
          <template #empty>
            <div class="text-center py-8 text-gray-500">
              <i class="pi pi-book text-4xl mb-3"></i>
              <p>No lesson plans found</p>
              <Button
                label="Create Your First Lesson Plan"
                icon="pi pi-plus"
                class="mt-4"
                @click="showCreateDialog = true"
                v-if="can('canManageLessonPlans')"
              />
            </div>
          </template>
        </DataTable>
      </template>
    </Card>

    <!-- Create/Edit Lesson Plan Dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      modal
      :header="editingLessonPlan ? 'Edit Lesson Plan' : 'New Lesson Plan'"
      :style="{ width: '50vw' }"
    >
      <LessonPlanForm
        v-if="showCreateDialog"
        :lesson-plan="editingLessonPlan"
        @save="onSaveLessonPlan"
        @cancel="showCreateDialog = false"
      />
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      modal
      header="Confirm Delete"
      :style="{ width: '400px' }"
    >
      <p>Are you sure you want to delete this lesson plan?</p>
      <template #footer>
        <Button label="Cancel" text @click="showDeleteDialog = false" />
        <Button
          label="Delete"
          severity="danger"
          @click="deleteLessonPlan"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useLessonPlanStore } from '~/stores/lessonPlanStore'
import { usePermissions } from '~/composables/usePermissions'
import { useToast } from 'primevue/usetoast'
import type { LessonPlan } from '~/types/lesson-planning'

// Define page metadata
definePageMeta({
  middleware: 'teacher', // Requires teacher, staff, or admin role
  layout: 'default'
})

// Composables
const store = useLessonPlanStore()
const { can } = usePermissions()
const toast = useToast()
const router = useRouter()

// State
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const editingLessonPlan = ref<LessonPlan | null>(null)
const deletingLessonPlan = ref<LessonPlan | null>(null)
const showArchived = ref(false)

const filters = ref({
  status: null as string | null,
  dateFrom: null as Date | null,
  dateTo: null as Date | null
})

const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Planned', value: 'planned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' }
]

// Computed
const lessonPlans = computed(() => store.lessonPlans)
const loading = computed(() => store.loading.lessonPlans)
const pagination = computed(() => store.pagination)

// Methods
const fetchLessonPlans = async () => {
  try {
    await store.fetchLessonPlans()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to fetch lesson plans',
      life: 3000
    })
  }
}

const applyFilters = () => {
  const filterParams: any = {
    is_archived: showArchived.value
  }

  if (filters.value.status) {
    filterParams.status = filters.value.status
  }

  if (filters.value.dateFrom) {
    filterParams.date_from = filters.value.dateFrom.toISOString().split('T')[0]
  }

  if (filters.value.dateTo) {
    filterParams.date_to = filters.value.dateTo.toISOString().split('T')[0]
  }

  store.setFilters(filterParams)
  fetchLessonPlans()
}

const clearFilters = () => {
  filters.value = {
    status: null,
    dateFrom: null,
    dateTo: null
  }
  store.resetFilters()
  fetchLessonPlans()
}

const toggleArchived = () => {
  showArchived.value = !showArchived.value
  applyFilters()
}

const onPage = (event: any) => {
  store.setPagination(event.page + 1, event.rows)
  fetchLessonPlans()
}

const viewLessonPlan = (id: string) => {
  router.push(`/lesson-planning/${id}`)
}

const editLessonPlan = async (id: string) => {
  try {
    const lessonPlan = await store.fetchLessonPlan(id)
    editingLessonPlan.value = lessonPlan
    showCreateDialog.value = true
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load lesson plan',
      life: 3000
    })
  }
}

const onSaveLessonPlan = async (lessonPlanData: any) => {
  try {
    if (editingLessonPlan.value) {
      await store.updateLessonPlan(editingLessonPlan.value.id, lessonPlanData)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Lesson plan updated successfully',
        life: 3000
      })
    } else {
      await store.createLessonPlan(lessonPlanData)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Lesson plan created successfully',
        life: 3000
      })
    }
    showCreateDialog.value = false
    editingLessonPlan.value = null
    await fetchLessonPlans()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save lesson plan',
      life: 3000
    })
  }
}

const completeLessonPlan = async (lessonPlan: LessonPlan) => {
  try {
    await store.updateLessonPlan(lessonPlan.id, {
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Lesson plan marked as completed',
      life: 3000
    })
    await fetchLessonPlans()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to update lesson plan',
      life: 3000
    })
  }
}

const archiveLessonPlan = async (lessonPlan: LessonPlan) => {
  try {
    await store.updateLessonPlan(lessonPlan.id, { is_archived: true })
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Lesson plan archived',
      life: 3000
    })
    await fetchLessonPlans()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to archive lesson plan',
      life: 3000
    })
  }
}

const confirmDelete = (lessonPlan: LessonPlan) => {
  deletingLessonPlan.value = lessonPlan
  showDeleteDialog.value = true
}

const deleteLessonPlan = async () => {
  if (!deletingLessonPlan.value) return

  try {
    await store.deleteLessonPlan(deletingLessonPlan.value.id)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Lesson plan deleted',
      life: 3000
    })
    showDeleteDialog.value = false
    deletingLessonPlan.value = null
    await fetchLessonPlans()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete lesson plan',
      life: 3000
    })
  }
}

// Helper functions
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatStatus = (status: string) => {
  return status.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

const getStatusSeverity = (status: string) => {
  const severityMap: Record<string, string> = {
    draft: 'secondary',
    planned: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'danger'
  }
  return severityMap[status] || 'secondary'
}

// Lifecycle
onMounted(() => {
  fetchLessonPlans()
})
</script>

<style scoped>
.lesson-planning-page {
  padding: 1.5rem;
}
</style>
