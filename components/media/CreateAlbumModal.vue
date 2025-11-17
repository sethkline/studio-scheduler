<template>
  <AppModal v-model="isOpen" title="Create Album" size="md" @close="handleClose">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <AppInput v-model="form.name" label="Album Name" required placeholder="e.g., Spring Recital 2025" />

      <div>
        <label class="block text-sm font-medium mb-1">Description (Optional)</label>
        <textarea v-model="form.description" class="w-full px-3 py-2 border border-gray-300 rounded-lg" rows="3"></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Privacy</label>
        <select v-model="form.privacy" class="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
          <option value="public">Public - Everyone can view</option>
          <option value="parents_only">Parents Only - Only parents can view</option>
          <option value="private">Private - Only you can view</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <input type="checkbox" id="featured" v-model="form.is_featured" class="h-4 w-4 text-primary-600 border-gray-300 rounded" />
        <label for="featured" class="text-sm font-medium cursor-pointer">Feature this album</label>
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <AppButton variant="secondary" @click="handleClose">Cancel</AppButton>
        <AppButton variant="primary" native-type="submit" :loading="submitting">Create Album</AppButton>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ modelValue: boolean; recitalShowId: string }>()
const emit = defineEmits(['update:modelValue', 'created'])

const submitting = ref(false)
const form = ref({ name: '', description: '', privacy: 'parents_only', is_featured: false })
const isOpen = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })

async function handleSubmit() {
  submitting.value = true
  try {
    await $fetch(`/api/recitals/${props.recitalShowId}/media-albums`, {
      method: 'POST',
      body: { ...form.value, recital_show_id: props.recitalShowId }
    })
    emit('created')
    handleClose()
  } catch (error) {
    console.error('Failed to create album:', error)
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  form.value = { name: '', description: '', privacy: 'parents_only', is_featured: false }
  emit('update:modelValue', false)
}
</script>
