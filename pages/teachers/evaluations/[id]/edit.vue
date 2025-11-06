<template>
  <div class="edit-evaluation-page">
    <div class="mb-6">
      <Button
        icon="pi pi-arrow-left"
        label="Back to Evaluations"
        severity="secondary"
        text
        @click="navigateTo('/teachers/evaluations')"
        class="mb-4"
      />

      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold">Edit Evaluation</h1>
          <p v-if="evaluation" class="text-surface-600 dark:text-surface-400 mt-1">
            {{ evaluation.student?.first_name }} {{ evaluation.student?.last_name }} - {{ evaluation.class_instance?.name }}
          </p>
        </div>

        <Tag
          v-if="evaluation"
          :value="evaluation.status"
          :severity="evaluation.status === 'submitted' ? 'success' : 'warning'"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Cannot Edit Submitted -->
    <Card v-else-if="evaluation && evaluation.status === 'submitted'">
      <template #content>
        <div class="text-center py-12">
          <i class="pi pi-lock text-6xl text-orange-400 mb-4"></i>
          <h3 class="text-xl font-semibold mb-2">Cannot Edit Submitted Evaluation</h3>
          <p class="text-surface-600 dark:text-surface-400 mb-4">
            This evaluation has been submitted and can no longer be edited.
          </p>
          <div class="flex gap-2 justify-center">
            <Button
              label="View Evaluation"
              icon="pi pi-eye"
              @click="navigateTo(`/teachers/evaluations/${id}/view`)"
            />
            <Button
              label="Back to List"
              severity="secondary"
              @click="navigateTo('/teachers/evaluations')"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Evaluation Form -->
    <Card v-else-if="evaluation">
      <template #content>
        <EvaluationForm
          :evaluation="evaluation"
          :students="[evaluation.student]"
          :classInstanceId="evaluation.class_instance_id"
          :teacherId="authStore.userProfile?.id || ''"
          @submit="handleSubmit"
          @cancel="handleCancel"
        />
      </template>
    </Card>

    <!-- Error State -->
    <Card v-else>
      <template #content>
        <div class="text-center py-12">
          <i class="pi pi-exclamation-triangle text-6xl text-red-400 mb-4"></i>
          <h3 class="text-xl font-semibold mb-2">Evaluation Not Found</h3>
          <p class="text-surface-600 dark:text-surface-400 mb-4">
            The evaluation you're trying to edit could not be found.
          </p>
          <Button
            label="Back to List"
            @click="navigateTo('/teachers/evaluations')"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import type { EvaluationWithSkills } from '~/types/assessment'

definePageMeta({
  middleware: 'teacher',
  layout: 'default'
})

const route = useRoute()
const authStore = useAuthStore()
const evaluationService = useEvaluationService()
const toast = useToast()
const { hasRole } = usePermissions()

const id = computed(() => route.params.id as string)

// State
const loading = ref(false)
const evaluation = ref<EvaluationWithSkills | null>(null)

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

      // Check permissions
      if (!hasRole(['admin', 'staff'])) {
        // Teachers can only edit their own evaluations
        if (evaluation.value.teacher_id !== authStore.userProfile?.id) {
          toast.add({
            severity: 'error',
            summary: 'Access Denied',
            detail: 'You do not have permission to edit this evaluation',
            life: 5000
          })
          navigateTo('/teachers/evaluations')
          return
        }
      }
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

function handleSubmit(data: { evaluation: EvaluationWithSkills }) {
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Evaluation updated successfully',
    life: 3000
  })

  // Navigate to view page
  navigateTo(`/teachers/evaluations/${data.evaluation.id}/view`)
}

function handleCancel() {
  navigateTo('/teachers/evaluations')
}
</script>

<style scoped>
.edit-evaluation-page {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
