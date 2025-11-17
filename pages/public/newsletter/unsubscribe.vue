<script setup lang="ts">
/**
 * Newsletter Unsubscribe Page
 *
 * Public page that allows users to unsubscribe from the blog newsletter
 * or all studio emails. Email can be pre-filled from query parameter.
 */

definePageMeta({
  layout: 'auth' // Use minimal layout for public page
})

const route = useRoute()
const router = useRouter()

const email = ref((route.query.email as string) || '')
const unsubscribeAll = ref(false)
const loading = ref(false)
const success = ref(false)
const errorMessage = ref('')

const unsubscribe = async () => {
  if (!email.value) {
    errorMessage.value = 'Please enter your email address'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch('/api/public/newsletter/unsubscribe', {
      method: 'POST',
      body: {
        email: email.value,
        unsubscribeAll: unsubscribeAll.value
      }
    })

    if (response.success) {
      success.value = true
    } else {
      errorMessage.value = response.message || 'Failed to unsubscribe. Please try again.'
    }
  } catch (error: any) {
    console.error('Unsubscribe error:', error)
    errorMessage.value = error.data?.message || 'Failed to unsubscribe. Please try again.'
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="unsubscribe-page">
    <div class="container">
      <Card class="unsubscribe-card">
        <template #header>
          <div class="card-header">
            <i class="pi pi-envelope text-4xl text-gray-400 mb-4"></i>
            <h1 class="text-2xl font-bold">Unsubscribe from Newsletter</h1>
          </div>
        </template>

        <template #content>
          <div v-if="success" class="success-content">
            <Message severity="success" :closable="false">
              You have been unsubscribed successfully.
            </Message>
            <p class="mt-4 text-gray-600">
              You will no longer receive
              <strong>{{ unsubscribeAll ? 'any emails' : 'blog newsletter emails' }}</strong>
              from us.
            </p>
            <p class="mt-2 text-sm text-gray-500">
              We're sorry to see you go! If you change your mind, you can always
              subscribe again from our website.
            </p>
            <div class="mt-6">
              <Button
                label="Return to Home"
                icon="pi pi-home"
                @click="goBack"
                class="w-full sm:w-auto"
              />
            </div>
          </div>

          <form v-else @submit.prevent="unsubscribe" class="unsubscribe-form">
            <Message v-if="errorMessage" severity="error" :closable="true" @close="errorMessage = ''">
              {{ errorMessage }}
            </Message>

            <div class="form-field">
              <label for="email" class="form-label">Email Address</label>
              <InputText
                id="email"
                v-model="email"
                type="email"
                placeholder="your@email.com"
                required
                :disabled="loading"
                class="w-full"
              />
              <small class="form-help">
                Enter the email address you used to subscribe
              </small>
            </div>

            <div class="form-field">
              <div class="flex items-center gap-2">
                <Checkbox
                  v-model="unsubscribeAll"
                  binary
                  inputId="unsubscribe-all"
                  :disabled="loading"
                />
                <label for="unsubscribe-all" class="cursor-pointer">
                  Unsubscribe from <strong>all</strong> studio emails (not just blog newsletter)
                </label>
              </div>
              <small class="form-help ml-8">
                This includes class updates, recital notifications, and promotional emails
              </small>
            </div>

            <div class="form-actions">
              <Button
                type="submit"
                label="Unsubscribe"
                icon="pi pi-sign-out"
                severity="danger"
                :loading="loading"
                class="w-full sm:w-auto"
              />
              <Button
                type="button"
                label="Cancel"
                icon="pi pi-times"
                severity="secondary"
                outlined
                @click="goBack"
                :disabled="loading"
                class="w-full sm:w-auto"
              />
            </div>
          </form>
        </template>

        <template #footer>
          <div class="card-footer">
            <p class="text-xs text-gray-500">
              Having trouble? Contact us at
              <a href="mailto:support@example.com" class="text-primary-500 hover:underline">
                support@example.com
              </a>
            </p>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.unsubscribe-page {
  @apply min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4;
}

.container {
  @apply w-full max-w-2xl;
}

.unsubscribe-card {
  @apply shadow-lg;
}

.card-header {
  @apply flex flex-col items-center text-center p-6;
}

.success-content {
  @apply text-center;
}

.unsubscribe-form {
  @apply space-y-6;
}

.form-field {
  @apply space-y-2;
}

.form-label {
  @apply block font-medium text-gray-700 dark:text-gray-300;
}

.form-help {
  @apply block text-gray-500 dark:text-gray-400 mt-1;
}

.form-actions {
  @apply flex flex-col sm:flex-row gap-3 pt-4;
}

.card-footer {
  @apply text-center;
}
</style>
