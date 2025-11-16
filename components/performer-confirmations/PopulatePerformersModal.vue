<template>
  <AppModal v-model="isOpen" title="Populate Performers" size="lg" @close="handleClose">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <p class="text-sm text-gray-600">
        This will automatically create performer confirmations for all students enrolled in classes that have performances in this recital.
      </p>

      <!-- Options -->
      <div class="space-y-3">
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            v-model="form.include_all_enrollments"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span class="text-sm">Include all current enrollments</span>
        </label>

        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            v-model="form.apply_eligibility_rules"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span class="text-sm">Apply eligibility rules (attendance, payments, etc.)</span>
        </label>
      </div>

      <!-- Results (after submission) -->
      <div v-if="results" class="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 class="font-medium text-green-900 mb-2">Performers Populated Successfully!</h4>
        <ul class="text-sm text-green-800 space-y-1">
          <li>✓ Created {{ results.created_confirmations }} confirmation records</li>
          <li>✓ {{ results.eligible_performers }} eligible performers</li>
          <li v-if="results.ineligible_performers > 0" class="text-yellow-700">
            ⚠ {{ results.ineligible_performers }} ineligible performers
          </li>
        </ul>

        <div v-if="results.ineligible_details && results.ineligible_details.length > 0" class="mt-3">
          <p class="text-sm font-medium text-yellow-800">Ineligible Students:</p>
          <ul class="mt-2 space-y-1">
            <li
              v-for="detail in results.ineligible_details"
              :key="detail.student_id"
              class="text-xs text-yellow-700"
            >
              {{ detail.student_name }} ({{ detail.class_name }}): {{ detail.reason }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4">
        <AppButton variant="secondary" @click="handleClose" :disabled="submitting">Cancel</AppButton>
        <AppButton variant="primary" native-type="submit" :loading="submitting">
          {{ results ? 'Done' : 'Populate Performers' }}
        </AppButton>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ modelValue: boolean; recitalId: string }>()
const emit = defineEmits(['update:modelValue', 'populated'])

const submitting = ref(false)
const results = ref<any>(null)

const form = ref({
  include_all_enrollments: true,
  apply_eligibility_rules: true,
})

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

async function handleSubmit() {
  if (results.value) {
    emit('populated')
    handleClose()
    return
  }

  submitting.value = true
  try {
    const { data } = await $fetch(`/api/recitals/${props.recitalId}/populate-performers`, {
      method: 'POST',
      body: form.value,
    })
    results.value = data
  } catch (error) {
    console.error('Failed to populate performers:', error)
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  form.value = {
    include_all_enrollments: true,
    apply_eligibility_rules: true,
  }
  results.value = null
  emit('update:modelValue', false)
}
</script>
