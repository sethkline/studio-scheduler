<template>
  <div class="view-evaluation-page">
    <div class="mb-6">
      <Button
        icon="pi pi-arrow-left"
        label="Back to Evaluations"
        severity="secondary"
        text
        @click="navigateTo('/teachers/evaluations')"
        class="mb-4"
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Evaluation View -->
    <div v-else-if="evaluation" class="space-y-6">
      <!-- Header -->
      <Card>
        <template #content>
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-3xl font-bold mb-2">Student Evaluation</h1>
              <div class="space-y-1 text-surface-600 dark:text-surface-400">
                <div class="flex items-center gap-2">
                  <i class="pi pi-user"></i>
                  <span class="font-medium">
                    {{ evaluation.student?.first_name }} {{ evaluation.student?.last_name }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <i class="pi pi-graduation-cap"></i>
                  <span>{{ evaluation.class_instance?.name }}</span>
                </div>
                <div v-if="evaluation.schedule" class="flex items-center gap-2">
                  <i class="pi pi-calendar"></i>
                  <span>{{ evaluation.schedule.name }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <i class="pi pi-user-edit"></i>
                  <span>{{ evaluation.teacher?.first_name }} {{ evaluation.teacher?.last_name }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <i class="pi pi-clock"></i>
                  <span>{{ formatDate(evaluation.created_at) }}</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col items-end gap-2">
              <Tag
                :value="evaluation.status"
                :severity="evaluation.status === 'submitted' ? 'success' : 'warning'"
                class="text-lg px-4 py-2"
              />

              <div class="flex gap-2 mt-4">
                <Button
                  v-if="canEdit"
                  label="Edit"
                  icon="pi pi-pencil"
                  severity="secondary"
                  @click="navigateTo(`/teachers/evaluations/${id}/edit`)"
                />
                <Button
                  label="Download PDF"
                  icon="pi pi-download"
                  @click="downloadPDF"
                />
                <Button
                  v-if="canDelete"
                  label="Delete"
                  icon="pi pi-trash"
                  severity="danger"
                  @click="confirmDelete"
                />
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Overall Ratings -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-chart-bar"></i>
            <span>Overall Assessment</span>
          </div>
        </template>
        <template #content>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="text-center p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
              <div class="text-sm text-surface-600 dark:text-surface-400 mb-2">Overall Performance</div>
              <Rating
                v-if="evaluation.overall_rating"
                :modelValue="evaluation.overall_rating"
                :readonly="true"
                :cancel="false"
                :stars="5"
                class="justify-center"
              />
              <div class="text-2xl font-bold mt-2">
                {{ evaluation.overall_rating || 'N/A' }}/5
              </div>
            </div>

            <div class="text-center p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
              <div class="text-sm text-surface-600 dark:text-surface-400 mb-2">Effort Level</div>
              <Rating
                v-if="evaluation.effort_rating"
                :modelValue="evaluation.effort_rating"
                :readonly="true"
                :cancel="false"
                :stars="5"
                class="justify-center"
              />
              <div class="text-2xl font-bold mt-2">
                {{ evaluation.effort_rating || 'N/A' }}/5
              </div>
            </div>

            <div class="text-center p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
              <div class="text-sm text-surface-600 dark:text-surface-400 mb-2">Attitude</div>
              <Rating
                v-if="evaluation.attitude_rating"
                :modelValue="evaluation.attitude_rating"
                :readonly="true"
                :cancel="false"
                :stars="5"
                class="justify-center"
              />
              <div class="text-2xl font-bold mt-2">
                {{ evaluation.attitude_rating || 'N/A' }}/5
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Skills Assessment -->
      <Card v-if="evaluation.evaluation_skills && evaluation.evaluation_skills.length > 0">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-list"></i>
            <span>Skills Assessment</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-3">
            <div
              v-for="skill in skillsByCategory"
              :key="skill.category"
              class="border border-surface-200 dark:border-surface-700 rounded-lg p-4"
            >
              <h4 class="font-semibold text-lg mb-3 capitalize">{{ skill.category }}</h4>
              <div class="space-y-2">
                <div
                  v-for="(s, index) in skill.skills"
                  :key="index"
                  class="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-800 rounded"
                >
                  <div>
                    <div class="font-medium">{{ s.skill_name }}</div>
                    <div v-if="s.notes" class="text-sm text-surface-600 dark:text-surface-400 mt-1">
                      {{ s.notes }}
                    </div>
                  </div>
                  <Tag
                    :value="formatRating(s.rating)"
                    :severity="getRatingSeverity(s.rating)"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Written Feedback -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card v-if="evaluation.strengths">
          <template #title>
            <div class="flex items-center gap-2 text-green-600 dark:text-green-400">
              <i class="pi pi-star"></i>
              <span>Strengths</span>
            </div>
          </template>
          <template #content>
            <p class="whitespace-pre-wrap">{{ evaluation.strengths }}</p>
          </template>
        </Card>

        <Card v-if="evaluation.areas_for_improvement">
          <template #title>
            <div class="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <i class="pi pi-arrow-up"></i>
              <span>Areas for Improvement</span>
            </div>
          </template>
          <template #content>
            <p class="whitespace-pre-wrap">{{ evaluation.areas_for_improvement }}</p>
          </template>
        </Card>
      </div>

      <Card v-if="evaluation.comments">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-comment"></i>
            <span>Additional Comments</span>
          </div>
        </template>
        <template #content>
          <p class="whitespace-pre-wrap">{{ evaluation.comments }}</p>
        </template>
      </Card>

      <!-- Recommendations -->
      <Card v-if="evaluation.recommended_level">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-arrow-circle-up"></i>
            <span>Recommendations</span>
          </div>
        </template>
        <template #content>
          <div class="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <i class="pi pi-info-circle text-2xl text-blue-600 dark:text-blue-400"></i>
            <div>
              <div class="font-medium">Recommended Next Level</div>
              <div class="text-lg font-semibold text-blue-700 dark:text-blue-300">
                {{ evaluation.recommended_level?.name }}
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Error State -->
    <Card v-else>
      <template #content>
        <div class="text-center py-12">
          <i class="pi pi-exclamation-triangle text-6xl text-red-400 mb-4"></i>
          <h3 class="text-xl font-semibold mb-2">Evaluation Not Found</h3>
          <p class="text-surface-600 dark:text-surface-400 mb-4">
            The evaluation you're trying to view could not be found.
          </p>
          <Button
            label="Back to List"
            @click="navigateTo('/teachers/evaluations')"
          />
        </div>
      </template>
    </Card>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm'
import type { EvaluationWithSkills, SkillRating } from '~/types/assessment'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const route = useRoute()
const authStore = useAuthStore()
const evaluationService = useEvaluationService()
const toast = useToast()
const confirm = useConfirm()
const { hasRole } = usePermissions()

const id = computed(() => route.params.id as string)

// State
const loading = ref(false)
const evaluation = ref<EvaluationWithSkills | null>(null)

const canEdit = computed(() => {
  if (!evaluation.value) return false
  if (hasRole(['admin', 'staff'])) return true
  return evaluation.value.status === 'draft' && evaluation.value.teacher_id === authStore.userProfile?.id
})

const canDelete = computed(() => {
  if (!evaluation.value) return false
  if (hasRole(['admin', 'staff'])) return true
  return evaluation.value.status === 'draft' && evaluation.value.teacher_id === authStore.userProfile?.id
})

const skillsByCategory = computed(() => {
  if (!evaluation.value?.evaluation_skills) return []

  const grouped = evaluation.value.evaluation_skills.reduce((acc, skill) => {
    const category = skill.skill_category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(skill)
    return acc
  }, {} as Record<string, typeof evaluation.value.evaluation_skills>)

  return Object.keys(grouped).map(category => ({
    category,
    skills: grouped[category]
  }))
})

// Load evaluation on mount
onMounted(async () => {
  await loadEvaluation()
})

async function loadEvaluation() {
  loading.value = true
  try {
    const { data, error } = await evaluationService.fetchEvaluationById(id.value)

    if (error.value) throw error.value

    if (data.value) {
      evaluation.value = data.value.evaluation
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load evaluation',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatRating(rating: SkillRating): string {
  const labels: Record<SkillRating, string> = {
    needs_work: 'Needs Work',
    proficient: 'Proficient',
    excellent: 'Excellent'
  }
  return labels[rating] || rating
}

function getRatingSeverity(rating: SkillRating): 'danger' | 'info' | 'success' {
  const severities: Record<SkillRating, 'danger' | 'info' | 'success'> = {
    needs_work: 'danger',
    proficient: 'info',
    excellent: 'success'
  }
  return severities[rating] || 'info'
}

function downloadPDF() {
  window.open(`/api/evaluations/${id.value}/pdf`, '_blank')
}

function confirmDelete() {
  confirm.require({
    message: 'Are you sure you want to delete this evaluation? This action cannot be undone.',
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        const { error } = await evaluationService.deleteEvaluation(id.value)

        if (error.value) throw error.value

        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Evaluation deleted successfully',
          life: 3000
        })

        navigateTo('/teachers/evaluations')
      } catch (error: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to delete evaluation',
          life: 5000
        })
      }
    }
  })
}
</script>

<style scoped>
.view-evaluation-page {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
