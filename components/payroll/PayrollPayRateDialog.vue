<script setup lang="ts">
import type { Teacher, TeacherPayRate, CreateTeacherPayRateInput } from '~/types'

const props = defineProps<{
  visible: boolean
  teachers: Teacher[]
  editingRate?: TeacherPayRate | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'created': [data: CreateTeacherPayRateInput]
  'updated': [data: Partial<CreateTeacherPayRateInput>]
  'closed': []
}>()

const formData = ref<CreateTeacherPayRateInput>({
  teacher_id: '',
  rate_type: 'hourly',
  rate_amount: 0,
  effective_from: new Date().toISOString().split('T')[0],
  effective_to: null,
  overtime_enabled: false,
  overtime_threshold_hours: 40,
  overtime_multiplier: 1.5,
  notes: ''
})

const rateTypes = [
  { label: 'Hourly', value: 'hourly' },
  { label: 'Per Class', value: 'per_class' },
  { label: 'Salary', value: 'salary' }
]

// Watch for editing rate changes
watch(() => props.editingRate, (rate) => {
  if (rate) {
    formData.value = {
      teacher_id: rate.teacher_id,
      rate_type: rate.rate_type,
      rate_amount: rate.rate_amount,
      effective_from: rate.effective_from,
      effective_to: rate.effective_to,
      overtime_enabled: rate.overtime_enabled,
      overtime_threshold_hours: rate.overtime_threshold_hours || 40,
      overtime_multiplier: rate.overtime_multiplier,
      notes: rate.notes || ''
    }
  }
}, { immediate: true })

const close = () => {
  emit('update:visible', false)
  emit('closed')
  resetForm()
}

const resetForm = () => {
  if (!props.editingRate) {
    formData.value = {
      teacher_id: '',
      rate_type: 'hourly',
      rate_amount: 0,
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: null,
      overtime_enabled: false,
      overtime_threshold_hours: 40,
      overtime_multiplier: 1.5,
      notes: ''
    }
  }
}

const submit = () => {
  if (props.editingRate) {
    emit('updated', formData.value)
  } else {
    emit('created', formData.value)
  }
  close()
}

const isFormValid = computed(() => {
  return formData.value.teacher_id &&
    formData.value.rate_type &&
    formData.value.rate_amount > 0 &&
    formData.value.effective_from
})
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="editingRate ? 'Edit Pay Rate' : 'Create Pay Rate'"
    :style="{ width: '600px' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="space-y-4">
      <!-- Teacher -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Teacher *</label>
        <Select
          v-model="formData.teacher_id"
          :options="teachers"
          optionLabel="first_name"
          optionValue="id"
          class="w-full"
          :disabled="!!editingRate"
        >
          <template #value="{ value }">
            <span v-if="value">
              {{ teachers.find(t => t.id === value)?.first_name }} {{ teachers.find(t => t.id === value)?.last_name }}
            </span>
            <span v-else class="text-gray-400">Select a teacher</span>
          </template>
          <template #option="{ option }">
            {{ option.first_name }} {{ option.last_name }}
          </template>
        </Select>
      </div>

      <!-- Rate Type -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rate Type *</label>
        <Select
          v-model="formData.rate_type"
          :options="rateTypes"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>

      <!-- Rate Amount -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rate Amount *</label>
        <InputNumber
          v-model="formData.rate_amount"
          mode="currency"
          currency="USD"
          :minFractionDigits="2"
          class="w-full"
        />
        <small class="text-gray-500">
          <span v-if="formData.rate_type === 'hourly'">Per hour</span>
          <span v-else-if="formData.rate_type === 'per_class'">Per class</span>
          <span v-else>Annual salary</span>
        </small>
      </div>

      <!-- Effective Dates -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Effective From *</label>
          <DatePicker
            v-model="formData.effective_from"
            dateFormat="yy-mm-dd"
            class="w-full"
            showIcon
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Effective To</label>
          <DatePicker
            v-model="formData.effective_to"
            dateFormat="yy-mm-dd"
            class="w-full"
            showIcon
          />
          <small class="text-gray-500">Leave empty for current rate</small>
        </div>
      </div>

      <!-- Overtime -->
      <div class="flex items-center gap-2">
        <Checkbox v-model="formData.overtime_enabled" inputId="overtime" binary />
        <label for="overtime" class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Enable Overtime
        </label>
      </div>

      <!-- Overtime Settings -->
      <div v-if="formData.overtime_enabled" class="grid grid-cols-2 gap-4 ml-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Threshold (hours/period)
          </label>
          <InputNumber
            v-model="formData.overtime_threshold_hours"
            :min="0"
            :max="168"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Multiplier
          </label>
          <InputNumber
            v-model="formData.overtime_multiplier"
            :min="1"
            :max="3"
            :minFractionDigits="2"
            :maxFractionDigits="2"
            class="w-full"
          />
        </div>
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
        <Textarea
          v-model="formData.notes"
          rows="3"
          class="w-full"
          placeholder="Optional notes about this rate"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" text @click="close" />
        <Button
          :label="editingRate ? 'Update' : 'Create'"
          @click="submit"
          :disabled="!isFormValid"
        />
      </div>
    </template>
  </Dialog>
</template>
