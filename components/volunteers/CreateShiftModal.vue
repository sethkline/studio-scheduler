<template>
  <AppModal
    v-model="isOpen"
    :title="isEditing ? 'Edit Shift' : 'Create Volunteer Shift'"
    size="lg"
    @close="handleClose"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <AppInput v-model="form.title" label="Shift Title" required placeholder="e.g., Front Door Ushers" />
      
      <div>
        <label class="block text-sm font-medium mb-1">Description</label>
        <textarea v-model="form.description" class="w-full px-3 py-2 border border-gray-300 rounded-lg" rows="3"></textarea>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Role</label>
          <select v-model="form.role" class="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
            <option value="">Select role</option>
            <option value="usher">Usher</option>
            <option value="ticket_scanner">Ticket Scanner</option>
            <option value="backstage">Backstage Helper</option>
            <option value="dressing_room">Dressing Room</option>
            <option value="setup">Setup Crew</option>
            <option value="cleanup">Cleanup Crew</option>
            <option value="concessions">Concessions</option>
            <option value="photographer">Photographer</option>
            <option value="other">Other</option>
          </select>
        </div>
        <AppInput v-model="form.location" label="Location (Optional)" placeholder="e.g., Main Lobby" />
      </div>

      <div class="grid grid-cols-3 gap-4">
        <AppInput v-model="form.date" label="Date" type="date" required />
        <AppInput v-model="form.start_time" label="Start Time" type="time" required />
        <AppInput v-model="form.end_time" label="End Time" type="time" required />
      </div>

      <AppInput v-model="form.slots_total" label="Number of Volunteers Needed" type="number" min="1" required />

      <div class="flex justify-end gap-3 pt-4">
        <AppButton variant="secondary" @click="handleClose">Cancel</AppButton>
        <AppButton variant="primary" native-type="submit" :loading="submitting">
          {{ isEditing ? 'Update Shift' : 'Create Shift' }}
        </AppButton>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{ modelValue: boolean; recitalShowId: string; shift?: any }>()
const emit = defineEmits(['update:modelValue', 'created', 'updated'])

const submitting = ref(false)
const form = ref({ title: '', description: '', role: '', location: '', date: '', start_time: '', end_time: '', slots_total: 1 })

const isOpen = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })
const isEditing = computed(() => !!props.shift)

async function handleSubmit() {
  submitting.value = true
  try {
    const url = isEditing.value ? `/api/volunteer-shifts/${props.shift.id}` : `/api/recitals/${props.recitalShowId}/volunteer-shifts`
    await $fetch(url, { method: isEditing.value ? 'PUT' : 'POST', body: { ...form.value, recital_show_id: props.recitalShowId } })
    emit(isEditing.value ? 'updated' : 'created')
    handleClose()
  } catch (error) {
    console.error('Failed to save shift:', error)
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  form.value = { title: '', description: '', role: '', location: '', date: '', start_time: '', end_time: '', slots_total: 1 }
  emit('update:modelValue', false)
}

watch(() => props.shift, (shift) => {
  if (shift) form.value = { ...shift }
})
</script>
