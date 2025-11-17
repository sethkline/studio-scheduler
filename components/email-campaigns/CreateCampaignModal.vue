<template>
  <AppModal v-model="isOpen" title="Create Email Campaign" size="xl" @close="handleClose">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Campaign Name -->
      <AppInput
        v-model="form.campaign_name"
        label="Campaign Name"
        placeholder="e.g., Dress Rehearsal Reminder"
        required
      />

      <!-- Subject Line -->
      <AppInput
        v-model="form.subject_line"
        label="Subject Line"
        placeholder="e.g., Important: Dress Rehearsal Tomorrow!"
        required
      />

      <!-- Target Audience -->
      <div>
        <label class="block text-sm font-medium mb-2">Send To</label>
        <select
          v-model="form.target_audience"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg"
          required
        >
          <option value="all_parents">All Parents</option>
          <option value="all_staff">All Staff</option>
          <option value="specific_class">Specific Class (Coming Soon)</option>
        </select>
      </div>

      <!-- Email Body -->
      <div>
        <label class="block text-sm font-medium mb-2">Email Message</label>
        <textarea
          v-model="form.email_body_html"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
          rows="10"
          required
          placeholder="Enter your email message here...

You can use these merge tags:
{{parent_name}} - Recipient's name
{{student_name}} - Student's name
{{recital_name}} - Recital name
{{recital_date}} - Recital date"
        ></textarea>
        <p class="text-xs text-gray-500 mt-1">
          Tip: Use merge tags like {{parent_name}} for personalization
        </p>
      </div>

      <!-- From Email -->
      <div class="grid grid-cols-2 gap-4">
        <AppInput
          v-model="form.from_name"
          label="From Name"
          placeholder="Dance Studio"
        />
        <AppInput
          v-model="form.from_email"
          type="email"
          label="From Email"
          placeholder="info@studio.com"
        />
      </div>

      <!-- Urgent -->
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          v-model="form.is_urgent"
          class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span class="text-sm">Mark as urgent notification</span>
      </label>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4">
        <AppButton variant="secondary" @click="handleClose" :disabled="submitting">Cancel</AppButton>
        <AppButton variant="secondary" @click="saveDraft" :loading="submitting">
          Save Draft
        </AppButton>
        <AppButton variant="primary" native-type="submit" :loading="submitting">
          Create & Send
        </AppButton>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ modelValue: boolean; recitalId?: string }>()
const emit = defineEmits(['update:modelValue', 'created'])

const submitting = ref(false)

const form = ref({
  campaign_name: '',
  subject_line: '',
  target_audience: 'all_parents',
  email_body_html: '',
  from_name: 'Dance Studio',
  from_email: 'noreply@studio.com',
  is_urgent: false,
})

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

async function handleSubmit() {
  submitting.value = true
  try {
    const { data } = await $fetch('/api/email-campaigns', {
      method: 'POST',
      body: {
        ...form.value,
        recital_id: props.recitalId,
      },
    })

    const campaignId = (data as any)?.campaign?.id

    if (campaignId) {
      // Send the campaign immediately
      await $fetch(`/api/email-campaigns/${campaignId}/send`, { method: 'POST' })
    }

    emit('created')
    handleClose()
  } catch (error) {
    console.error('Failed to create campaign:', error)
  } finally {
    submitting.value = false
  }
}

async function saveDraft() {
  submitting.value = true
  try {
    await $fetch('/api/email-campaigns', {
      method: 'POST',
      body: {
        ...form.value,
        recital_id: props.recitalId,
      },
    })

    emit('created')
    handleClose()
  } catch (error) {
    console.error('Failed to save draft:', error)
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  form.value = {
    campaign_name: '',
    subject_line: '',
    target_audience: 'all_parents',
    email_body_html: '',
    from_name: 'Dance Studio',
    from_email: 'noreply@studio.com',
    is_urgent: false,
  }
  emit('update:modelValue', false)
}
</script>
