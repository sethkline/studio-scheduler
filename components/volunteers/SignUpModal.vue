<template>
  <AppModal v-model="isOpen" title="Sign Up for Shift" size="md" @close="handleClose">
    <div v-if="shift" class="space-y-4">
      <div class="bg-gray-50 rounded-lg p-4">
        <h3 class="font-medium">{{ shift.title }}</h3>
        <p class="text-sm text-gray-600 mt-1">
          {{ formatDate(shift.date) }} • {{ formatTime(shift.start_time) }} - {{ formatTime(shift.end_time) }}
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Notes (Optional)</label>
        <textarea
          v-model="notes"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg"
          rows="3"
          placeholder="Any questions or special requirements?"
        ></textarea>
      </div>

      <div class="flex justify-end gap-3">
        <AppButton variant="secondary" @click="handleClose">Cancel</AppButton>
        <AppButton variant="primary" @click="handleSignUp" :loading="submitting">
          Confirm Sign Up
        </AppButton>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ modelValue: boolean; shift: any }>()
const emit = defineEmits(['update:modelValue', 'signed-up'])

const submitting = ref(false)
const notes = ref('')
const isOpen = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })

async function handleSignUp() {
  submitting.value = true
  try {
    await $fetch(`/api/volunteer-shifts/${props.shift.id}/sign-up`, {
      method: 'POST',
      body: { notes: notes.value }
    })
    emit('signed-up')
    handleClose()
  } catch (error) {
    console.error('Failed to sign up:', error)
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  notes.value = ''
  emit('update:modelValue', false)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatTime(t: string) {
  const parts = t.split(':')
  const hour = parseInt(parts[0]) % 12 || 12
  const ampm = parseInt(parts[0]) >= 12 ? 'PM' : 'AM'
  return `${hour}:${parts[1]} ${ampm}`
}
</script>
