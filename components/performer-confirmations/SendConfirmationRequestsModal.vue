<template>
  <AppModal v-model="isOpen" title="Send Confirmation Requests" size="lg" @close="handleClose">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <p class="text-sm text-gray-600">
        Send email requests to parents asking them to confirm their child's participation in the recital.
      </p>

      <!-- Send To -->
      <div>
        <label class="block text-sm font-medium mb-2">Send To</label>
        <select
          v-model="form.send_to"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All Performers</option>
          <option value="pending_only">Pending Confirmations Only</option>
        </select>
      </div>

      <!-- Send Via -->
      <div>
        <label class="block text-sm font-medium mb-2">Send Via</label>
        <div class="space-y-2">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              v-model="sendViaEmail"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span class="text-sm">Email</span>
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              v-model="sendViaSms"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              disabled
            />
            <span class="text-sm text-gray-400">SMS (Coming Soon)</span>
          </label>
        </div>
      </div>

      <!-- Confirmation Deadline -->
      <AppInput
        v-model="form.confirmation_deadline"
        type="date"
        label="Confirmation Deadline"
        required
      />

      <!-- Results -->
      <div v-if="results" class="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 class="font-medium text-green-900 mb-2">Requests Sent Successfully!</h4>
        <ul class="text-sm text-green-800 space-y-1">
          <li>✓ {{ results.emails_sent }} emails sent</li>
          <li v-if="results.sms_sent > 0">✓ {{ results.sms_sent }} SMS sent</li>
          <li v-if="results.failed > 0" class="text-red-700">✗ {{ results.failed }} failed</li>
        </ul>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4">
        <AppButton variant="secondary" @click="handleClose" :disabled="submitting">Cancel</AppButton>
        <AppButton
          variant="primary"
          native-type="submit"
          :loading="submitting"
          :disabled="!sendViaEmail && !sendViaSms"
        >
          {{ results ? 'Done' : 'Send Requests' }}
        </AppButton>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ modelValue: boolean; recitalId: string }>()
const emit = defineEmits(['update:modelValue', 'sent'])

const submitting = ref(false)
const results = ref<any>(null)
const sendViaEmail = ref(true)
const sendViaSms = ref(false)

const form = ref({
  send_to: 'all',
  confirmation_deadline: '',
})

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

async function handleSubmit() {
  if (results.value) {
    emit('sent')
    handleClose()
    return
  }

  submitting.value = true
  try {
    const sendVia = []
    if (sendViaEmail.value) sendVia.push('email')
    if (sendViaSms.value) sendVia.push('sms')

    const { data } = await $fetch(`/api/recitals/${props.recitalId}/send-confirmation-requests`, {
      method: 'POST',
      body: {
        ...form.value,
        send_via: sendVia,
      },
    })
    results.value = data
  } catch (error) {
    console.error('Failed to send confirmation requests:', error)
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  form.value = {
    send_to: 'all',
    confirmation_deadline: '',
  }
  sendViaEmail.value = true
  sendViaSms.value = false
  results.value = null
  emit('update:modelValue', false)
}
</script>
