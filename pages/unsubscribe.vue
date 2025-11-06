<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <i class="pi pi-envelope text-4xl text-purple-600 mb-4"></i>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Email Preferences</h1>
        <p class="text-gray-600">Manage your email subscription settings</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <ProgressSpinner />
        <p class="mt-4 text-gray-600">Loading your preferences...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-8">
        <i class="pi pi-exclamation-circle text-4xl text-red-500 mb-4"></i>
        <p class="text-red-600 mb-4">{{ error }}</p>
        <Button label="Try Again" @click="loadPreferences" severity="secondary" />
      </div>

      <!-- Success State (After Unsubscribe) -->
      <div v-else-if="unsubscribed" class="text-center py-8">
        <i class="pi pi-check-circle text-4xl text-green-500 mb-4"></i>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Unsubscribed Successfully</h2>
        <p class="text-gray-600 mb-2">You have been unsubscribed from:</p>
        <p class="font-medium text-gray-900 mb-6">{{ preferences?.email }}</p>
        <p class="text-sm text-gray-500 mb-6">
          You will no longer receive emails from us. If you change your mind, you can resubscribe
          using the preferences link in any future emails.
        </p>
        <Button label="Resubscribe" @click="resubscribe" severity="secondary" outlined />
      </div>

      <!-- Preferences Form -->
      <form v-else @submit.prevent="savePreferences" class="space-y-6">
        <!-- Email Address -->
        <div class="bg-gray-50 rounded-lg p-4">
          <p class="text-sm font-medium text-gray-700 mb-1">Email Address</p>
          <p class="text-gray-900">{{ preferences?.email }}</p>
        </div>

        <!-- Global Toggle -->
        <div class="border-b pb-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Email Notifications</h3>
              <p class="text-sm text-gray-600 mt-1">
                {{ preferences?.email_enabled ? 'You are subscribed' : 'You are unsubscribed' }}
              </p>
            </div>
            <InputSwitch v-model="preferences.email_enabled" />
          </div>
        </div>

        <!-- Category Preferences (Only if emails are enabled) -->
        <div v-if="preferences?.email_enabled" class="space-y-4">
          <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Email Categories
          </h3>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium text-gray-900">Enrollment Updates</label>
                <p class="text-sm text-gray-600">Class enrollment and registration updates</p>
              </div>
              <InputSwitch v-model="preferences.enrollment_emails" />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium text-gray-900">Payment Notifications</label>
                <p class="text-sm text-gray-600">Billing, receipts, and payment reminders</p>
              </div>
              <InputSwitch v-model="preferences.payment_emails" />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium text-gray-900">Recital Information</label>
                <p class="text-sm text-gray-600">Recital schedules, tickets, and updates</p>
              </div>
              <InputSwitch v-model="preferences.recital_emails" />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium text-gray-900">Announcements</label>
                <p class="text-sm text-gray-600">Studio news and important announcements</p>
              </div>
              <InputSwitch v-model="preferences.announcement_emails" />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium text-gray-900">Reminders</label>
                <p class="text-sm text-gray-600">Class reminders and upcoming events</p>
              </div>
              <InputSwitch v-model="preferences.reminder_emails" />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium text-gray-900">Marketing Emails</label>
                <p class="text-sm text-gray-600">Special offers and promotions</p>
              </div>
              <InputSwitch v-model="preferences.marketing_emails" />
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 pt-4">
          <Button
            label="Save Preferences"
            type="submit"
            :loading="saving"
            class="flex-1"
            severity="primary"
          />
          <Button
            label="Unsubscribe from All"
            @click="unsubscribeAll"
            :loading="saving"
            severity="danger"
            outlined
          />
        </div>

        <!-- Help Text -->
        <p class="text-xs text-gray-500 text-center mt-6">
          Note: Even if you unsubscribe, you may still receive important account-related emails
          such as password resets and critical service notifications.
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EmailPreferences } from '~/types/email'

definePageMeta({
  layout: 'auth', // Use minimal layout
  middleware: [], // No authentication required
})

const route = useRoute()
const toast = useToast()
const emailService = useEmailService()

// Get token from URL
const token = computed(() => route.query.token as string | undefined)

// State
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const unsubscribed = ref(false)
const preferences = ref<EmailPreferences | null>(null)

// Load preferences on mount
onMounted(() => {
  loadPreferences()
})

// Watch for token changes
watch(token, () => {
  if (token.value) {
    loadPreferences()
  }
})

/**
 * Load email preferences
 */
async function loadPreferences() {
  if (!token.value) {
    error.value = 'Invalid or missing unsubscribe token'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = null

    const response = await emailService.fetchPreferences(token.value)
    preferences.value = response.preferences

    // Check if already unsubscribed
    if (preferences.value && !preferences.value.email_enabled) {
      unsubscribed.value = true
    }
  } catch (err: any) {
    console.error('Error loading preferences:', err)
    error.value = err.data?.statusMessage || 'Failed to load email preferences'
  } finally {
    loading.value = false
  }
}

/**
 * Save preferences
 */
async function savePreferences() {
  if (!token.value || !preferences.value) return

  try {
    saving.value = true

    await emailService.updatePreferences(
      {
        email_enabled: preferences.value.email_enabled,
        enrollment_emails: preferences.value.enrollment_emails,
        payment_emails: preferences.value.payment_emails,
        recital_emails: preferences.value.recital_emails,
        announcement_emails: preferences.value.announcement_emails,
        reminder_emails: preferences.value.reminder_emails,
        marketing_emails: preferences.value.marketing_emails,
      },
      token.value
    )

    toast.add({
      severity: 'success',
      summary: 'Preferences Saved',
      detail: 'Your email preferences have been updated successfully',
      life: 3000,
    })

    // Reset unsubscribed flag if re-enabling
    if (preferences.value.email_enabled) {
      unsubscribed.value = false
    }
  } catch (err: any) {
    console.error('Error saving preferences:', err)
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: err.data?.statusMessage || 'Failed to save email preferences',
      life: 5000,
    })
  } finally {
    saving.value = false
  }
}

/**
 * Unsubscribe from all emails
 */
async function unsubscribeAll() {
  if (!token.value) return

  try {
    saving.value = true

    await emailService.unsubscribe(token.value)

    unsubscribed.value = true
    if (preferences.value) {
      preferences.value.email_enabled = false
    }

    toast.add({
      severity: 'info',
      summary: 'Unsubscribed',
      detail: 'You have been unsubscribed from all emails',
      life: 3000,
    })
  } catch (err: any) {
    console.error('Error unsubscribing:', err)
    toast.add({
      severity: 'error',
      summary: 'Unsubscribe Failed',
      detail: err.data?.statusMessage || 'Failed to unsubscribe',
      life: 5000,
    })
  } finally {
    saving.value = false
  }
}

/**
 * Resubscribe to emails
 */
async function resubscribe() {
  if (!preferences.value) return

  preferences.value.email_enabled = true
  unsubscribed.value = false
  await savePreferences()
}
</script>
