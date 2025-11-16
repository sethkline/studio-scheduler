<template>
  <AppModal v-model="isOpen" title="Check In Student" size="lg" @close="handleClose">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Student Selection (simplified - in real app would have search) -->
      <AppInput
        v-model="form.student_id"
        label="Student ID"
        placeholder="Enter student ID or use QR scanner"
        required
      />

      <!-- Has All Costumes -->
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          v-model="form.has_all_costumes"
          class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span class="text-sm">Student has all costumes and props</span>
      </label>

      <!-- Missing Items (if applicable) -->
      <AppInput
        v-if="!form.has_all_costumes"
        v-model="form.missing_items"
        label="Missing Items"
        placeholder="e.g., Tutu, Hair bow"
      />

      <!-- Guardian Contact -->
      <AppInput
        v-model="form.guardian_contact"
        label="Guardian Contact (Optional)"
        placeholder="Phone number if guardian is staying"
      />

      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium mb-1">Notes</label>
        <textarea
          v-model="form.notes"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg"
          rows="3"
          placeholder="Any special notes or concerns..."
        ></textarea>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4">
        <AppButton variant="secondary" @click="handleClose" :disabled="submitting">Cancel</AppButton>
        <AppButton variant="primary" native-type="submit" :loading="submitting">
          Check In
        </AppButton>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ modelValue: boolean; showId: string }>()
const emit = defineEmits(['update:modelValue', 'checked-in'])

const submitting = ref(false)

const form = ref({
  student_id: '',
  has_all_costumes: true,
  missing_items: '',
  guardian_contact: '',
  notes: '',
})

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

async function handleSubmit() {
  submitting.value = true
  try {
    await $fetch(`/api/shows/${props.showId}/check-in`, {
      method: 'POST',
      body: form.value,
    })

    emit('checked-in')
    handleClose()
  } catch (error) {
    console.error('Failed to check in student:', error)
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  form.value = {
    student_id: '',
    has_all_costumes: true,
    missing_items: '',
    guardian_contact: '',
    notes: '',
  }
  emit('update:modelValue', false)
}
</script>
