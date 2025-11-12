<template>
  <div class="lesson-plan-form">
    <div class="space-y-4">
      <!-- Title -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Title *</label>
        <InputText
          v-model="form.title"
          placeholder="Lesson title"
          class="w-full"
          :class="{ 'p-invalid': submitted && !form.title }"
        />
        <small v-if="submitted && !form.title" class="p-error">Title is required</small>
      </div>

      <!-- Lesson Date -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Lesson Date *</label>
        <DatePicker
          v-model="form.lesson_date"
          placeholder="Select date"
          class="w-full"
          :class="{ 'p-invalid': submitted && !form.lesson_date }"
        />
        <small v-if="submitted && !form.lesson_date" class="p-error">Date is required</small>
      </div>

      <!-- Duration -->
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

      <!-- Status -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
        <Select
          v-model="form.status"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          placeholder="Select status"
          class="w-full"
        />
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <Textarea
          v-model="form.description"
          rows="3"
          placeholder="Brief description of the lesson"
          class="w-full"
        />
      </div>

      <!-- Warm Up -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Warm Up</label>
        <Textarea
          v-model="form.warm_up"
          rows="2"
          placeholder="Warm up activities"
          class="w-full"
        />
      </div>

      <!-- Main Activity -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Main Activity</label>
        <Textarea
          v-model="form.main_activity"
          rows="3"
          placeholder="Main lesson activities"
          class="w-full"
        />
      </div>

      <!-- Cool Down -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Cool Down</label>
        <Textarea
          v-model="form.cool_down"
          rows="2"
          placeholder="Cool down activities"
          class="w-full"
        />
      </div>

      <!-- Materials Needed -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Materials Needed</label>
        <Textarea
          v-model="form.materials_needed"
          rows="2"
          placeholder="List of materials and equipment"
          class="w-full"
        />
      </div>

      <!-- Homework -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Homework / Practice</label>
        <Textarea
          v-model="form.homework"
          rows="2"
          placeholder="Practice assignments for students"
          class="w-full"
        />
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Private Notes</label>
        <Textarea
          v-model="form.notes"
          rows="2"
          placeholder="Your private notes (not visible to students)"
          class="w-full"
        />
      </div>
    </div>

    <!-- Form Actions -->
    <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
      <Button
        label="Cancel"
        severity="secondary"
        @click="$emit('cancel')"
      />
      <Button
        label="Save"
        @click="handleSubmit"
        :loading="saving"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import type { LessonPlan } from '~/types/lesson-planning'

const props = defineProps<{
  lessonPlan?: LessonPlan | null
}>()

const emit = defineEmits<{
  save: [data: any]
  cancel: []
}>()

const authStore = useAuthStore()
const submitted = ref(false)
const saving = ref(false)

const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Planned', value: 'planned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' }
]

const form = ref({
  title: '',
  lesson_date: null as Date | null,
  duration: 60,
  status: 'draft',
  description: '',
  warm_up: '',
  main_activity: '',
  cool_down: '',
  materials_needed: '',
  homework: '',
  notes: ''
})

const handleSubmit = () => {
  submitted.value = true

  if (!form.value.title || !form.value.lesson_date) {
    return
  }

  saving.value = true

  const lessonPlanData = {
    ...form.value,
    lesson_date: form.value.lesson_date?.toISOString().split('T')[0],
    class_instance_id: props.lessonPlan?.class_instance_id || '', // This should come from class selection
    teacher_id: authStore.profile?.id || ''
  }

  emit('save', lessonPlanData)
  saving.value = false
}

onMounted(() => {
  if (props.lessonPlan) {
    form.value = {
      title: props.lessonPlan.title,
      lesson_date: props.lessonPlan.lesson_date ? new Date(props.lessonPlan.lesson_date) : null,
      duration: props.lessonPlan.duration || 60,
      status: props.lessonPlan.status,
      description: props.lessonPlan.description || '',
      warm_up: props.lessonPlan.warm_up || '',
      main_activity: props.lessonPlan.main_activity || '',
      cool_down: props.lessonPlan.cool_down || '',
      materials_needed: props.lessonPlan.materials_needed || '',
      homework: props.lessonPlan.homework || '',
      notes: props.lessonPlan.notes || ''
    }
  }
})
</script>
