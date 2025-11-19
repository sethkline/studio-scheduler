<template>
  <AppModal v-model="isOpen" title="Shift Details" size="xl" @close="handleClose">
    <div v-if="loading" class="py-8 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
    </div>

    <div v-else-if="shift" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-500">Role</p>
          <p class="font-medium">{{ shift.role }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Time</p>
          <p class="font-medium">{{ shift.start_time }} - {{ shift.end_time }}</p>
        </div>
      </div>

      <div>
        <h3 class="font-medium mb-2">Volunteers ({{ shift.volunteers?.length || 0 }})</h3>
        <div v-if="shift.volunteers && shift.volunteers.length > 0" class="space-y-2">
          <div
            v-for="volunteer in shift.volunteers"
            :key="volunteer.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded"
          >
            <span>{{ volunteer.first_name }} {{ volunteer.last_name }}</span>
            <span class="text-sm text-gray-600">{{ volunteer.email }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-gray-500">No volunteers signed up yet</p>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{ modelValue: boolean; shiftId: string | null }>()
const emit = defineEmits(['update:modelValue'])

const loading = ref(false)
const shift = ref<any>(null)
const isOpen = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })

async function fetchShift() {
  if (!props.shiftId) return
  loading.value = true
  try {
    const data = await $fetch(`/api/volunteer-shifts/${props.shiftId}`)
    shift.value = data
  } catch (error) {
    console.error('Failed to fetch shift:', error)
  } finally {
    loading.value = false
  }
}

function handleClose() {
  emit('update:modelValue', false)
}

watch(() => props.modelValue, (v) => {
  if (v && props.shiftId) fetchShift()
})
</script>
