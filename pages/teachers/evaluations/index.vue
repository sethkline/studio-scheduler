<template>
  <div class="teachers-evaluations-page">
    <div class="mb-6">
      <div class="flex justify-between items-center mb-2">
        <div>
          <h1 class="text-3xl font-bold">Student Evaluations</h1>
          <p class="text-surface-600 dark:text-surface-400 mt-1">
            Evaluate student progress and track development over time
          </p>
        </div>
        <Button
          label="New Evaluation"
          icon="pi pi-plus"
          @click="navigateTo('/teachers/evaluations/create')"
        />
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <template #content>
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <i class="pi pi-file-edit text-2xl text-blue-600 dark:text-blue-400"></i>
            </div>
            <div>
              <div class="text-2xl font-bold">{{ stats.total }}</div>
              <div class="text-sm text-surface-600 dark:text-surface-400">Total Evaluations</div>
            </div>
          </div>
        </template>
      </Card>

      <Card>
        <template #content>
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
              <i class="pi pi-clock text-2xl text-yellow-600 dark:text-yellow-400"></i>
            </div>
            <div>
              <div class="text-2xl font-bold">{{ stats.drafts }}</div>
              <div class="text-sm text-surface-600 dark:text-surface-400">Drafts</div>
            </div>
          </div>
        </template>
      </Card>

      <Card>
        <template #content>
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <i class="pi pi-check-circle text-2xl text-green-600 dark:text-green-400"></i>
            </div>
            <div>
              <div class="text-2xl font-bold">{{ stats.submitted }}</div>
              <div class="text-sm text-surface-600 dark:text-surface-400">Submitted</div>
            </div>
          </div>
        </template>
      </Card>

      <Card>
        <template #content>
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <i class="pi pi-calendar text-2xl text-purple-600 dark:text-purple-400"></i>
            </div>
            <div>
              <div class="text-2xl font-bold">{{ stats.thisMonth }}</div>
              <div class="text-sm text-surface-600 dark:text-surface-400">This Month</div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Evaluations List -->
    <EvaluationsList
      :evaluations="evaluations"
      :loading="loading"
      :totalRecords="totalRecords"
      :classInstances="classInstances"
      :schedules="schedules"
      @create="navigateTo('/teachers/evaluations/create')"
      @view="viewEvaluation"
      @edit="editEvaluation"
      @delete="deleteEvaluation"
      @download="downloadPDF"
      @filter="handleFilter"
      @page="handlePage"
    />
  </div>
</template>

<script setup lang="ts">
import type { EvaluationWithSkills, EvaluationFilters } from '~/types/assessment'

definePageMeta({
  middleware: 'teacher',
  layout: 'default'
})

const evaluationService = useEvaluationService()
const toast = useToast()
const authStore = useAuthStore()

// State
const loading = ref(false)
const evaluations = ref<EvaluationWithSkills[]>([])
const totalRecords = ref(0)
const classInstances = ref<Array<{ id: string; name: string }>>([])
const schedules = ref<Array<{ id: string; name: string }>>([])
const currentPage = ref(1)
const currentFilters = ref<EvaluationFilters>({})

const stats = computed(() => {
  const total = evaluations.value.length
  const drafts = evaluations.value.filter(e => e.status === 'draft').length
  const submitted = evaluations.value.filter(e => e.status === 'submitted').length

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonth = evaluations.value.filter(e =>
    new Date(e.created_at) >= firstOfMonth
  ).length

  return {
    total,
    drafts,
    submitted,
    thisMonth
  }
})

// Load data on mount
onMounted(async () => {
  await Promise.all([
    loadEvaluations(),
    loadClassInstances(),
    loadSchedules()
  ])
})

async function loadEvaluations() {
  loading.value = true
  try {
    const { data, error } = await evaluationService.fetchEvaluations(
      currentFilters.value,
      { page: currentPage.value, limit: 20 }
    )

    if (error.value) throw error.value

    if (data.value) {
      evaluations.value = data.value.evaluations
      totalRecords.value = data.value.pagination.totalItems
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load evaluations',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

async function loadClassInstances() {
  try {
    // Load teacher's classes
    const { data } = await useFetch('/api/teachers/my-classes', {
      headers: useRequestHeaders(['cookie'])
    })

    if (data.value) {
      classInstances.value = data.value.classes || []
    }
  } catch (error) {
    console.error('Failed to load class instances:', error)
  }
}

async function loadSchedules() {
  try {
    const { data } = await useFetch('/api/schedules', {
      headers: useRequestHeaders(['cookie'])
    })

    if (data.value) {
      schedules.value = data.value.schedules || []
    }
  } catch (error) {
    console.error('Failed to load schedules:', error)
  }
}

function viewEvaluation(evaluation: EvaluationWithSkills) {
  navigateTo(`/teachers/evaluations/${evaluation.id}/view`)
}

function editEvaluation(evaluation: EvaluationWithSkills) {
  navigateTo(`/teachers/evaluations/${evaluation.id}/edit`)
}

async function deleteEvaluation(evaluation: EvaluationWithSkills) {
  loading.value = true
  try {
    const { error } = await evaluationService.deleteEvaluation(evaluation.id)

    if (error.value) throw error.value

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Evaluation deleted successfully',
      life: 3000
    })

    await loadEvaluations()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to delete evaluation',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

async function downloadPDF(evaluation: EvaluationWithSkills) {
  try {
    // Navigate to PDF generation endpoint
    window.open(`/api/evaluations/${evaluation.id}/pdf`, '_blank')
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to generate PDF',
      life: 5000
    })
  }
}

function handleFilter(filters: EvaluationFilters) {
  currentFilters.value = filters
  currentPage.value = 1
  loadEvaluations()
}

function handlePage(event: any) {
  currentPage.value = event.page + 1
  loadEvaluations()
}
</script>

<style scoped>
.teachers-evaluations-page {
  padding: 2rem;
}
</style>
