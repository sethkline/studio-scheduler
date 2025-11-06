<template>
  <div class="evaluation-form">
    <Form
      v-slot="$form"
      :initialValues="formData"
      :resolver="formResolver"
      @submit="onSubmit"
      class="space-y-6"
    >
      <!-- Student and Class Info -->
      <div class="bg-surface-50 dark:bg-surface-800 p-4 rounded-lg">
        <h3 class="text-lg font-semibold mb-3">Evaluation Information</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Student Select -->
          <div class="field">
            <label for="student_id" class="font-medium text-sm mb-1 block">Student*</label>
            <Select
              id="student_id"
              name="student_id"
              :options="students"
              optionLabel="label"
              optionValue="value"
              placeholder="Select Student"
              class="w-full"
              :disabled="!!props.evaluation"
              @change="onStudentChange"
            />
            <Message
              v-if="$form.student_id?.invalid"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ $form.student_id.error?.message }}
            </Message>
          </div>

          <!-- Term/Schedule Select -->
          <div class="field">
            <label for="schedule_id" class="font-medium text-sm mb-1 block">Term/Schedule</label>
            <Select
              id="schedule_id"
              name="schedule_id"
              :options="schedules"
              optionLabel="label"
              optionValue="value"
              placeholder="Select Term"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <!-- Overall Ratings -->
      <div class="bg-surface-50 dark:bg-surface-800 p-4 rounded-lg">
        <h3 class="text-lg font-semibold mb-3">Overall Assessment</h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Overall Rating -->
          <div class="field">
            <label for="overall_rating" class="font-medium text-sm mb-1 block">Overall Performance</label>
            <Rating id="overall_rating" name="overall_rating" :stars="5" :cancel="false" />
            <Message
              v-if="$form.overall_rating?.invalid"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ $form.overall_rating.error?.message }}
            </Message>
          </div>

          <!-- Effort Rating -->
          <div class="field">
            <label for="effort_rating" class="font-medium text-sm mb-1 block">Effort Level</label>
            <Rating id="effort_rating" name="effort_rating" :stars="5" :cancel="false" />
            <Message
              v-if="$form.effort_rating?.invalid"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ $form.effort_rating.error?.message }}
            </Message>
          </div>

          <!-- Attitude Rating -->
          <div class="field">
            <label for="attitude_rating" class="font-medium text-sm mb-1 block">Attitude</label>
            <Rating id="attitude_rating" name="attitude_rating" :stars="5" :cancel="false" />
            <Message
              v-if="$form.attitude_rating?.invalid"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ $form.attitude_rating.error?.message }}
            </Message>
          </div>
        </div>
      </div>

      <!-- Skills Assessment -->
      <div class="bg-surface-50 dark:bg-surface-800 p-4 rounded-lg">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-lg font-semibold">Skills Assessment</h3>
          <Button
            type="button"
            label="Load Skill Template"
            icon="pi pi-download"
            severity="secondary"
            size="small"
            @click="loadSkillTemplate"
            :disabled="!canLoadTemplate"
            :loading="loadingTemplate"
          />
        </div>

        <div v-if="skills.length === 0" class="text-center py-8 text-surface-500">
          <i class="pi pi-list text-4xl mb-2"></i>
          <p>No skills added yet. Click "Load Skill Template" to get started.</p>
        </div>

        <div v-else class="space-y-3">
          <SkillRatingInput
            v-for="(skill, index) in skills"
            :key="index"
            :skill="skill"
            :index="index"
            @update="updateSkill"
            @remove="removeSkill"
          />

          <Button
            type="button"
            label="Add Skill"
            icon="pi pi-plus"
            severity="secondary"
            size="small"
            @click="addSkill"
            class="w-full"
          />
        </div>
      </div>

      <!-- Written Feedback -->
      <div class="bg-surface-50 dark:bg-surface-800 p-4 rounded-lg">
        <h3 class="text-lg font-semibold mb-3">Written Feedback</h3>

        <div class="space-y-4">
          <!-- Strengths -->
          <div class="field">
            <label for="strengths" class="font-medium text-sm mb-1 block">Strengths</label>
            <Textarea
              id="strengths"
              name="strengths"
              rows="3"
              class="w-full"
              placeholder="What is the student doing well?"
            />
            <Message
              v-if="$form.strengths?.invalid"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ $form.strengths.error?.message }}
            </Message>
          </div>

          <!-- Areas for Improvement -->
          <div class="field">
            <label for="areas_for_improvement" class="font-medium text-sm mb-1 block">Areas for Improvement</label>
            <Textarea
              id="areas_for_improvement"
              name="areas_for_improvement"
              rows="3"
              class="w-full"
              placeholder="What should the student focus on?"
            />
            <Message
              v-if="$form.areas_for_improvement?.invalid"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ $form.areas_for_improvement.error?.message }}
            </Message>
          </div>

          <!-- Additional Comments -->
          <div class="field">
            <label for="comments" class="font-medium text-sm mb-1 block">Additional Comments</label>
            <Textarea
              id="comments"
              name="comments"
              rows="4"
              class="w-full"
              placeholder="Any other comments or observations?"
            />
            <Message
              v-if="$form.comments?.invalid"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ $form.comments.error?.message }}
            </Message>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div class="bg-surface-50 dark:bg-surface-800 p-4 rounded-lg">
        <h3 class="text-lg font-semibold mb-3">Recommendations</h3>

        <div class="field">
          <label for="recommended_next_level" class="font-medium text-sm mb-1 block">Recommended Next Level</label>
          <Select
            id="recommended_next_level"
            name="recommended_next_level"
            :options="classLevels"
            optionLabel="name"
            optionValue="id"
            placeholder="Select Level"
            class="w-full"
          />
        </div>
      </div>

      <!-- Previous Evaluations -->
      <div v-if="previousEvaluations.length > 0" class="bg-surface-50 dark:bg-surface-800 p-4 rounded-lg">
        <h3 class="text-lg font-semibold mb-3">Previous Evaluations</h3>
        <div class="space-y-2">
          <Card
            v-for="prev in previousEvaluations"
            :key="prev.id"
            class="cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700"
            @click="viewPreviousEvaluation(prev)"
          >
            <template #title>
              <div class="text-sm">
                {{ prev.class_instance?.name }} - {{ formatDate(prev.created_at) }}
              </div>
            </template>
            <template #content>
              <div class="text-xs text-surface-600 dark:text-surface-400">
                <span>Overall: {{ prev.overall_rating }}/5</span>
                <span class="mx-2">|</span>
                <span>{{ prev.status }}</span>
              </div>
            </template>
          </Card>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="flex justify-end gap-2 pt-4 border-t">
        <Button
          type="button"
          label="Cancel"
          severity="secondary"
          @click="$emit('cancel')"
          :disabled="loading"
        />
        <Button
          type="button"
          label="Save Draft"
          severity="secondary"
          icon="pi pi-save"
          @click="saveDraft"
          :loading="loading"
        />
        <Button
          type="submit"
          label="Submit Evaluation"
          icon="pi pi-check"
          :loading="loading"
        />
      </div>
    </Form>
  </div>
</template>

<script setup lang="ts">
import { Form } from '@primevue/forms'
import { z } from 'zod'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import type { Evaluation, EvaluationSkill, EvaluationWithSkills } from '~/types/assessment'

const props = defineProps<{
  evaluation?: EvaluationWithSkills
  students?: Array<{ id: string; first_name: string; last_name: string }>
  classInstanceId: string
  teacherId: string
}>()

const emit = defineEmits<{
  (e: 'submit', data: any): void
  (e: 'cancel'): void
}>()

// Services
const evaluationService = useEvaluationService()
const toast = useToast()

// State
const loading = ref(false)
const loadingTemplate = ref(false)
const skills = ref<Array<any>>([])
const previousEvaluations = ref<EvaluationWithSkills[]>([])
const schedules = ref<Array<{ label: string; value: string }>>([])
const classLevels = ref<Array<{ id: string; name: string }>>([])
const selectedStudent = ref<string | null>(null)

// Computed
const students = computed(() => {
  return props.students?.map(s => ({
    label: `${s.first_name} ${s.last_name}`,
    value: s.id
  })) || []
})

const canLoadTemplate = computed(() => {
  return selectedStudent.value && props.classInstanceId
})

// Form data
const formData = computed(() => {
  if (props.evaluation) {
    return {
      student_id: props.evaluation.student_id,
      schedule_id: props.evaluation.schedule_id,
      overall_rating: props.evaluation.overall_rating,
      effort_rating: props.evaluation.effort_rating,
      attitude_rating: props.evaluation.attitude_rating,
      strengths: props.evaluation.strengths,
      areas_for_improvement: props.evaluation.areas_for_improvement,
      comments: props.evaluation.comments,
      recommended_next_level: props.evaluation.recommended_next_level
    }
  }
  return {
    student_id: null,
    schedule_id: null,
    overall_rating: null,
    effort_rating: null,
    attitude_rating: null,
    strengths: '',
    areas_for_improvement: '',
    comments: '',
    recommended_next_level: null
  }
})

// Validation schema
const formSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  schedule_id: z.string().optional().nullable(),
  overall_rating: z.number().min(1).max(5).optional().nullable(),
  effort_rating: z.number().min(1).max(5).optional().nullable(),
  attitude_rating: z.number().min(1).max(5).optional().nullable(),
  strengths: z.string().optional(),
  areas_for_improvement: z.string().optional(),
  comments: z.string().optional(),
  recommended_next_level: z.string().optional().nullable()
})

const formResolver = zodResolver(formSchema)

// Load initial data
onMounted(async () => {
  if (props.evaluation) {
    selectedStudent.value = props.evaluation.student_id
    skills.value = props.evaluation.evaluation_skills || []
  }

  // Load schedules
  // TODO: Implement schedule fetching

  // Load class levels
  // TODO: Implement class level fetching
})

// Methods
async function loadSkillTemplate() {
  if (!canLoadTemplate.value) return

  loadingTemplate.value = true
  try {
    // Get class instance to find dance style and level
    const { data, error } = await evaluationService.fetchSkillTemplate(
      'dance-style-id', // TODO: Get from class instance
      'class-level-id'  // TODO: Get from class instance
    )

    if (error.value) throw error.value

    if (data.value?.skills) {
      skills.value = data.value.skills.map(skill => ({
        skill_name: skill.name,
        skill_category: skill.category,
        rating: 'proficient',
        notes: ''
      }))

      toast.add({
        severity: 'success',
        summary: 'Skills Loaded',
        detail: `Loaded ${data.value.skills.length} skills`,
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

async function onStudentChange(event: any) {
  selectedStudent.value = event.value

  if (selectedStudent.value) {
    // Load previous evaluations for comparison
    const { data } = await evaluationService.fetchStudentHistory(
      selectedStudent.value,
      props.classInstanceId,
      5
    )

    if (data.value) {
      previousEvaluations.value = data.value.evaluations
    }
  }
}

function addSkill() {
  skills.value.push({
    skill_name: '',
    skill_category: 'technique',
    rating: 'proficient',
    notes: ''
  })
}

function updateSkill(index: number, updatedSkill: any) {
  skills.value[index] = updatedSkill
}

function removeSkill(index: number) {
  skills.value.splice(index, 1)
}

function viewPreviousEvaluation(evaluation: EvaluationWithSkills) {
  // TODO: Open modal to view previous evaluation
  console.log('View previous evaluation:', evaluation)
}

async function saveDraft() {
  // Save as draft
  await handleSubmit('draft')
}

async function onSubmit(event: any) {
  // Submit as final
  await handleSubmit('submitted', event.values)
}

async function handleSubmit(status: 'draft' | 'submitted', values?: any) {
  loading.value = true

  try {
    const evaluationData = {
      evaluation: {
        student_id: values?.student_id || formData.value.student_id,
        teacher_id: props.teacherId,
        class_instance_id: props.classInstanceId,
        schedule_id: values?.schedule_id || formData.value.schedule_id,
        overall_rating: values?.overall_rating || formData.value.overall_rating,
        effort_rating: values?.effort_rating || formData.value.effort_rating,
        attitude_rating: values?.attitude_rating || formData.value.attitude_rating,
        strengths: values?.strengths || formData.value.strengths,
        areas_for_improvement: values?.areas_for_improvement || formData.value.areas_for_improvement,
        comments: values?.comments || formData.value.comments,
        recommended_next_level: values?.recommended_next_level || formData.value.recommended_next_level,
        status
      },
      skills: skills.value.filter(s => s.skill_name) // Only include skills with names
    }

    let result
    if (props.evaluation) {
      result = await evaluationService.updateEvaluation(props.evaluation.id, evaluationData)
    } else {
      result = await evaluationService.createEvaluation(evaluationData)
    }

    if (result.error.value) throw result.error.value

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: status === 'draft' ? 'Draft saved successfully' : 'Evaluation submitted successfully',
      life: 3000
    })

    emit('submit', result.data.value)
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save evaluation',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString()
}
</script>

<style scoped>
.evaluation-form {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
