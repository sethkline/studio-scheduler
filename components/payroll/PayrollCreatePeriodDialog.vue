<script setup lang="ts">
import type { CreatePayrollPeriodInput } from '~/types/payroll'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'created': [data: CreatePayrollPeriodInput]
}>()

const formData = ref<CreatePayrollPeriodInput>({
  period_name: '',
  period_type: 'bi-weekly',
  start_date: '',
  end_date: '',
  pay_date: '',
  notes: ''
})

const periodTypes = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-Weekly', value: 'bi-weekly' },
  { label: 'Semi-Monthly', value: 'semi-monthly' },
  { label: 'Monthly', value: 'monthly' }
]

// Auto-calculate end date based on period type
const calculateEndDate = () => {
  if (!formData.value.start_date) return

  const startDate = new Date(formData.value.start_date)
  let endDate = new Date(startDate)

  switch (formData.value.period_type) {
    case 'weekly':
      endDate.setDate(startDate.getDate() + 6)
      break
    case 'bi-weekly':
      endDate.setDate(startDate.getDate() + 13)
      break
    case 'semi-monthly':
      endDate.setDate(startDate.getDate() + 14)
      break
    case 'monthly':
      endDate.setMonth(startDate.getMonth() + 1)
      endDate.setDate(0) // Last day of month
      break
  }

  formData.value.end_date = endDate.toISOString().split('T')[0]

  // Set pay date to 7 days after end date
  const payDate = new Date(endDate)
  payDate.setDate(payDate.getDate() + 7)
  formData.value.pay_date = payDate.toISOString().split('T')[0]

  // Generate period name
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const startMonth = monthNames[startDate.getMonth()]
  const endMonth = monthNames[endDate.getMonth()]
  const year = startDate.getFullYear()

  if (startMonth === endMonth) {
    formData.value.period_name = `${startMonth} ${year} - ${formData.value.period_type}`
  } else {
    formData.value.period_name = `${startMonth}-${endMonth} ${year} - ${formData.value.period_type}`
  }
}

watch(() => formData.value.start_date, calculateEndDate)
watch(() => formData.value.period_type, calculateEndDate)

const close = () => {
  emit('update:visible', false)
  resetForm()
}

const resetForm = () => {
  formData.value = {
    period_name: '',
    period_type: 'bi-weekly',
    start_date: '',
    end_date: '',
    pay_date: '',
    notes: ''
  }
}

const submit = () => {
  emit('created', formData.value)
  close()
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Create Payroll Period"
    :style="{ width: '600px' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="space-y-4">
      <!-- Period Type -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period Type</label>
        <Select
          v-model="formData.period_type"
          :options="periodTypes"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>

      <!-- Start Date -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date *</label>
        <DatePicker
          v-model="formData.start_date"
          dateFormat="yy-mm-dd"
          class="w-full"
          showIcon
        />
      </div>

      <!-- End Date -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date *</label>
        <DatePicker
          v-model="formData.end_date"
          dateFormat="yy-mm-dd"
          class="w-full"
          showIcon
        />
      </div>

      <!-- Pay Date -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pay Date *</label>
        <DatePicker
          v-model="formData.pay_date"
          dateFormat="yy-mm-dd"
          class="w-full"
          showIcon
        />
      </div>

      <!-- Period Name -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period Name *</label>
        <InputText
          v-model="formData.period_name"
          class="w-full"
          placeholder="e.g., January 2024 - Week 1"
        />
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
        <Textarea
          v-model="formData.notes"
          rows="3"
          class="w-full"
          placeholder="Optional notes about this period"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" text @click="close" />
        <Button
          label="Create"
          @click="submit"
          :disabled="!formData.period_name || !formData.start_date || !formData.end_date || !formData.pay_date"
        />
      </div>
    </template>
  </Dialog>
</template>
