<template>
  <div class="create-evaluation-page">
    <div class="mb-6">
      <Button
        icon="pi pi-arrow-left"
        label="Back to Evaluations"
        severity="secondary"
        text
        @click="navigateTo('/teachers/evaluations')"
        class="mb-4"
      />

      <h1 class="text-3xl font-bold">Create New Evaluation</h1>
      <p class="text-surface-600 dark:text-surface-400 mt-1">
        Evaluate a student's progress and performance
      </p>
    </div>

    <!-- Class Selection -->
    <Card class="mb-6">
      <template #content>
        <div class="space-y-4">
          <div class="field">
            <label for="class" class="font-medium text-sm mb-1 block">Select Class*</label>
            <Select
              id="class"
              v-model="selectedClassId"
              :options="classes"
              optionLabel="name"
              optionValue="id"
              placeholder="Choose a class to evaluate"
              class="w-full"
              @update:modelValue="onClassChange"
            >
              <template #option="slotProps">
                <div class="flex flex-col">
                  <div class="font-medium">{{ slotProps.option.name }}</div>
                  <div class="text-sm text-surface-600 dark:text-surface-400">
                    {{ slotProps.option.dance_style?.name }} - {{ slotProps.option.class_level?.name }}
                  </div>
                </div>
              </template>
            </Select>
          </div>

          <div v-if="selectedClassId && enrolledStudents.length > 0" class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div class="flex items-start gap-3">
              <i class="pi pi-info-circle text-blue-600 dark:text-blue-400 mt-1"></i>
              <div>
                <div class="font-medium text-blue-900 dark:text-blue-100">
                  {{ enrolledStudents.length }} student(s) enrolled in this class
                </div>
                <div class="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  You can create individual evaluations below, or use the bulk evaluation feature to evaluate multiple students at once.
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedClassId" class="flex gap-2">
            <Button
              label="Bulk Evaluate Class"
              icon="pi pi-users"
              severity="secondary"
              @click="navigateTo(`/teachers/evaluations/bulk-create?class=${selectedClassId}`)"
              :disabled="!enrolledStudents.length"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Evaluation Form -->
    <Card v-if="selectedClassId && selectedClass">
      <template #content>
        <EvaluationForm
          :students="enrolledStudents"
          :classInstanceId="selectedClassId"
          :teacherId="authStore.userProfile?.id || ''"
          @submit="handleSubmit"
          @cancel="navigateTo('/teachers/evaluations')"
        />
      </template>
    </Card>

    <!-- No Class Selected State -->
    <Card v-else>
      <template #content>
        <div class="text-center py-12">
          <i class="pi pi-graduation-cap text-6xl text-surface-400 mb-4"></i>
          <h3 class="text-xl font-semibold mb-2">Select a Class</h3>
          <p class="text-surface-600 dark:text-surface-400">
            Choose a class from the dropdown above to begin creating an evaluation
          </p>
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

const authStore = useAuthStore()
const toast = useToast()

// State
const selectedClassId = ref<string | null>(null)
const classes = ref<any[]>([])
const enrolledStudents = ref<any[]>([])
const loading = ref(false)

const selectedClass = computed(() => {
  return classes.value.find(c => c.id === selectedClassId.value)
})

// Load teacher's classes on mount
onMounted(async () => {
  await loadClasses()
})

async function loadClasses() {
  loading.value = true
  try {
    const { data, error } = await useFetch('/api/teachers/my-classes', {
      headers: useRequestHeaders(['cookie'])
    })

    if (error.value) throw error.value

    if (data.value) {
      classes.value = data.value.classes || []
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load classes',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

async function onClassChange() {
  if (!selectedClassId.value) {
    enrolledStudents.value = []
    return
  }

  loading.value = true
  try {
    // Fetch enrolled students for this class
    const { data, error } = await useFetch(`/api/classes/${selectedClassId.value}/students`, {
      headers: useRequestHeaders(['cookie'])
    })

    if (error.value) throw error.value

    if (data.value) {
      enrolledStudents.value = data.value.students || []
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load students',
      life: 5000
    })
    enrolledStudents.value = []
  } finally {
    loading.value = false
  }
}

function handleSubmit(data: { evaluation: EvaluationWithSkills }) {
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Evaluation created successfully',
    life: 3000
  })

  // Navigate back to evaluations list or to the view page
  navigateTo(`/teachers/evaluations/${data.evaluation.id}/view`)
}
</script>

<style scoped>
.create-evaluation-page {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
