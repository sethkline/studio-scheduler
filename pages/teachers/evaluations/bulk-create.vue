<template>
  <div class="bulk-evaluation-page">
    <div class="mb-6">
      <Button
        icon="pi pi-arrow-left"
        label="Back to Evaluations"
        severity="secondary"
        text
        @click="navigateTo('/teachers/evaluations')"
        class="mb-4"
      />

      <h1 class="text-3xl font-bold">Bulk Evaluate Class</h1>
      <p class="text-surface-600 dark:text-surface-400 mt-1">
        Quickly evaluate all students in a class
      </p>
    </div>

    <!-- Class Selection -->
    <Card v-if="!selectedClass" class="mb-6">
      <template #content>
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
      </template>
    </Card>

    <!-- Bulk Evaluation Form -->
    <div v-else class="space-y-6">
      <!-- Class Info Card -->
      <Card>
        <template #content>
          <div class="flex justify-between items-center">
            <div>
              <h3 class="text-xl font-semibold">{{ selectedClass.name }}</h3>
              <p class="text-surface-600 dark:text-surface-400">
                {{ selectedClass.dance_style?.name }} - {{ selectedClass.class_level?.name }}
              </p>
              <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">
                {{ enrolledStudents.length }} students enrolled
              </p>
            </div>
            <Button
              label="Change Class"
              severity="secondary"
              @click="resetClass"
            />
          </div>
        </template>
      </Card>

      <!-- Term Selection -->
      <Card>
        <template #content>
          <div class="field">
            <label for="schedule" class="font-medium text-sm mb-1 block">Term/Schedule</label>
            <Select
              id="schedule"
              v-model="scheduleId"
              :options="schedules"
              optionLabel="name"
              optionValue="id"
              placeholder="Select Term (Optional)"
              class="w-full"
            />
          </div>
        </template>
      </Card>

      <!-- Student Evaluations -->
      <Card>
        <template #title>
          <div class="flex justify-between items-center">
            <span>Student Evaluations</span>
            <div class="flex gap-2">
              <Button
                label="Load Skills Template"
                icon="pi pi-download"
                severity="secondary"
                size="small"
                @click="loadSkillsTemplate"
                :loading="loadingTemplate"
              />
              <Button
                label="Apply Ratings to All"
                icon="pi pi-copy"
                severity="secondary"
                size="small"
                @click="applyRatingsToAll"
              />
            </div>
          </div>
        </template>
        <template #content>
          <Accordion :multiple="true" :activeIndex="[0]">
            <AccordionTab
              v-for="(student, index) in studentEvaluations"
              :key="student.student_id"
              :header="`${index + 1}. ${student.student_name}`"
            >
              <div class="space-y-4">
                <!-- Overall Ratings -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="field">
                    <label class="font-medium text-sm mb-1 block">Overall Performance</label>
                    <Rating v-model="student.overall_rating" :stars="5" :cancel="false" />
                  </div>
                  <div class="field">
                    <label class="font-medium text-sm mb-1 block">Effort Level</label>
                    <Rating v-model="student.effort_rating" :stars="5" :cancel="false" />
                  </div>
                  <div class="field">
                    <label class="font-medium text-sm mb-1 block">Attitude</label>
                    <Rating v-model="student.attitude_rating" :stars="5" :cancel="false" />
                  </div>
                </div>

                <!-- Written Feedback -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="field">
                    <label class="font-medium text-sm mb-1 block">Strengths</label>
                    <Textarea
                      v-model="student.strengths"
                      rows="2"
                      class="w-full"
                      placeholder="What is the student doing well?"
                    />
                  </div>
                  <div class="field">
                    <label class="font-medium text-sm mb-1 block">Areas for Improvement</label>
                    <Textarea
                      v-model="student.areas_for_improvement"
                      rows="2"
                      class="w-full"
                      placeholder="What should the student focus on?"
                    />
                  </div>
                </div>

                <!-- Comments -->
                <div class="field">
                  <label class="font-medium text-sm mb-1 block">Comments</label>
                  <Textarea
                    v-model="student.comments"
                    rows="2"
                    class="w-full"
                    placeholder="Additional comments..."
                  />
                </div>

                <!-- Skills (if loaded) -->
                <div v-if="student.skills && student.skills.length > 0">
                  <label class="font-medium text-sm mb-2 block">Skills</label>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div
                      v-for="(skill, skillIndex) in student.skills"
                      :key="skillIndex"
                      class="flex items-center gap-2 p-2 bg-surface-50 dark:bg-surface-800 rounded"
                    >
                      <span class="flex-1 text-sm">{{ skill.skill_name }}</span>
                      <Select
                        v-model="skill.rating"
                        :options="skillRatings"
                        optionLabel="label"
                        optionValue="value"
                        class="w-32"
                        size="small"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </AccordionTab>
          </Accordion>
        </template>
      </Card>

      <!-- Form Actions -->
      <Card>
        <template #content>
          <div class="flex justify-between items-center">
            <div class="text-sm text-surface-600 dark:text-surface-400">
              Evaluating {{ studentEvaluations.length }} students
            </div>
            <div class="flex gap-2">
              <Button
                label="Cancel"
                severity="secondary"
                @click="navigateTo('/teachers/evaluations')"
                :disabled="loading"
              />
              <Button
                label="Save All as Drafts"
                severity="secondary"
                icon="pi pi-save"
                @click="saveAsDrafts"
                :loading="loading"
              />
              <Button
                label="Submit All Evaluations"
                icon="pi pi-check"
                @click="submitAll"
                :loading="loading"
              />
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'teacher',
  layout: 'default'
})

const route = useRoute()
const authStore = useAuthStore()
const evaluationService = useEvaluationService()
const toast = useToast()

// State
const selectedClassId = ref<string | null>(route.query.class as string || null)
const scheduleId = ref<string | null>(null)
const classes = ref<any[]>([])
const enrolledStudents = ref<any[]>([])
const schedules = ref<any[]>([])
const loading = ref(false)
const loadingTemplate = ref(false)

const studentEvaluations = ref<Array<{
  student_id: string
  student_name: string
  overall_rating: number | null
  effort_rating: number | null
  attitude_rating: number | null
  strengths: string
  areas_for_improvement: string
  comments: string
  skills: Array<{ skill_name: string; skill_category: string; rating: string; notes: string }>
}>>([])

const skillRatings = [
  { label: 'Needs Work', value: 'needs_work' },
  { label: 'Proficient', value: 'proficient' },
  { label: 'Excellent', value: 'excellent' }
]

const selectedClass = computed(() => {
  return classes.value.find(c => c.id === selectedClassId.value)
})

// Load data on mount
onMounted(async () => {
  await loadClasses()
  await loadSchedules()

  if (selectedClassId.value) {
    await onClassChange()
  }
})

async function loadClasses() {
  try {
    const { data } = await useFetch('/api/teachers/my-classes', {
      headers: useRequestHeaders(['cookie'])
    })

    if (data.value) {
      classes.value = data.value.classes || []
    }
  } catch (error) {
    console.error('Failed to load classes:', error)
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

async function onClassChange() {
  if (!selectedClassId.value) return

  loading.value = true
  try {
    const { data, error } = await useFetch(`/api/classes/${selectedClassId.value}/students`, {
      headers: useRequestHeaders(['cookie'])
    })

    if (error.value) throw error.value

    if (data.value) {
      enrolledStudents.value = data.value.students || []

      // Initialize student evaluations
      studentEvaluations.value = enrolledStudents.value.map(student => ({
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        overall_rating: null,
        effort_rating: null,
        attitude_rating: null,
        strengths: '',
        areas_for_improvement: '',
        comments: '',
        skills: []
      }))
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load students',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

async function loadSkillsTemplate() {
  if (!selectedClass.value) return

  loadingTemplate.value = true
  try {
    const { data, error } = await evaluationService.fetchSkillTemplate(
      selectedClass.value.class_definition?.dance_style_id || selectedClass.value.dance_style_id,
      selectedClass.value.class_definition?.class_level_id || selectedClass.value.class_level_id
    )

    if (error.value) throw error.value

    if (data.value?.skills) {
      const templateSkills = data.value.skills.map((skill: any) => ({
        skill_name: skill.name,
        skill_category: skill.category,
        rating: 'proficient',
        notes: ''
      }))

      // Apply template skills to all students
      studentEvaluations.value.forEach(student => {
        student.skills = JSON.parse(JSON.stringify(templateSkills))
      })

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: `Loaded ${data.value.skills.length} skills for all students`,
        life: 3000
      })
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load skill template',
      life: 5000
    })
  } finally {
    loadingTemplate.value = false
  }
}

function applyRatingsToAll() {
  // Use first student's ratings as template
  const template = studentEvaluations.value[0]
  if (!template) return

  studentEvaluations.value.forEach((student, index) => {
    if (index === 0) return // Skip first student

    student.overall_rating = template.overall_rating
    student.effort_rating = template.effort_rating
    student.attitude_rating = template.attitude_rating
  })

  toast.add({
    severity: 'info',
    summary: 'Ratings Applied',
    detail: 'Applied ratings from first student to all students',
    life: 3000
  })
}

function resetClass() {
  selectedClassId.value = null
  studentEvaluations.value = []
  enrolledStudents.value = []
}

async function saveAsDrafts() {
  await handleBulkSubmit('draft')
}

async function submitAll() {
  await handleBulkSubmit('submitted')
}

async function handleBulkSubmit(status: 'draft' | 'submitted') {
  loading.value = true
  try {
    const evaluations = studentEvaluations.value.map(student => ({
      student_id: student.student_id,
      overall_rating: student.overall_rating,
      effort_rating: student.effort_rating,
      attitude_rating: student.attitude_rating,
      strengths: student.strengths,
      areas_for_improvement: student.areas_for_improvement,
      comments: student.comments,
      skills: student.skills.filter(s => s.skill_name),
      status
    }))

    const { data, error } = await evaluationService.bulkCreateEvaluations({
      class_instance_id: selectedClassId.value!,
      schedule_id: scheduleId.value || undefined,
      evaluations
    })

    if (error.value) throw error.value

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Created ${data.value?.count || 0} evaluations successfully`,
      life: 3000
    })

    navigateTo('/teachers/evaluations')
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to create evaluations',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.bulk-evaluation-page {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
