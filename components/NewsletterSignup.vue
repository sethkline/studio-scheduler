<script setup lang="ts">
/**
 * Newsletter Signup Component
 *
 * Reusable component for subscribing to the blog newsletter.
 * Can be used in footers, blog pages, or anywhere else.
 */

interface Props {
  variant?: 'default' | 'inline' | 'compact'
  showTitle?: boolean
  title?: string
  description?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  showTitle: true,
  title: 'Subscribe to Our Newsletter',
  description: 'Get the latest updates from our studio delivered to your inbox.'
})

const email = ref('')
const name = ref('')
const loading = ref(false)
const success = ref(false)
const errorMessage = ref('')

const subscribe = async () => {
  if (!email.value) {
    errorMessage.value = 'Please enter your email address'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch('/api/public/newsletter/subscribe', {
      method: 'POST',
      body: {
        email: email.value,
        name: name.value || null,
        source: 'website_form'
      }
    })

    if (response.success) {
      success.value = true
      email.value = ''
      name.value = ''

      // Reset success message after 5 seconds
      setTimeout(() => {
        success.value = false
      }, 5000)
    } else {
      errorMessage.value = response.message || 'Failed to subscribe. Please try again.'
    }
  } catch (error: any) {
    console.error('Newsletter subscription error:', error)
    errorMessage.value = error.data?.message || 'Failed to subscribe. Please try again.'
  } finally {
    loading.value = false
  }
}

const isInline = computed(() => props.variant === 'inline')
const isCompact = computed(() => props.variant === 'compact')
</script>

<template>
  <div class="newsletter-signup" :class="`variant-${variant}`">
    <div v-if="showTitle" class="newsletter-header">
      <h3 class="newsletter-title">{{ title }}</h3>
      <p v-if="!isCompact" class="newsletter-description">{{ description }}</p>
    </div>

    <Message v-if="success" severity="success" :closable="false">
      Successfully subscribed! Check your email for confirmation.
    </Message>

    <Message v-if="errorMessage" severity="error" :closable="true" @close="errorMessage = ''">
      {{ errorMessage }}
    </Message>

    <form @submit.prevent="subscribe" class="newsletter-form" :class="{ 'inline-form': isInline }">
      <div class="form-fields" :class="{ 'flex-row': isInline, 'flex-col': !isInline }">
        <InputText
          v-model="email"
          type="email"
          placeholder="Your email address"
          required
          :disabled="loading"
          class="flex-1"
        />
        <InputText
          v-if="!isCompact"
          v-model="name"
          placeholder="Your name (optional)"
          :disabled="loading"
          class="flex-1"
        />
        <Button
          type="submit"
          :loading="loading"
          :label="loading ? 'Subscribing...' : 'Subscribe'"
          icon="pi pi-envelope"
          :class="{ 'w-full sm:w-auto': !isInline }"
        />
      </div>
    </form>

    <p v-if="!isCompact" class="newsletter-privacy">
      We respect your privacy. Unsubscribe at any time.
    </p>
  </div>
</template>

<style scoped>
.newsletter-signup {
  @apply w-full;
}

.newsletter-header {
  @apply mb-4;
}

.newsletter-title {
  @apply text-xl font-semibold mb-2;
}

.newsletter-description {
  @apply text-gray-600 dark:text-gray-400 text-sm;
}

.newsletter-form {
  @apply w-full;
}

.form-fields {
  @apply flex gap-2 w-full;
}

.flex-row {
  @apply flex-row flex-wrap;
}

.flex-col {
  @apply flex-col;
}

.newsletter-privacy {
  @apply mt-2 text-xs text-gray-500 dark:text-gray-400;
}

/* Variant styles */
.variant-inline .newsletter-header {
  @apply mb-2;
}

.variant-inline .newsletter-title {
  @apply text-lg;
}

.variant-compact .newsletter-header {
  @apply mb-2;
}

.variant-compact .newsletter-title {
  @apply text-base;
}

.variant-compact .form-fields {
  @apply flex-row;
}
</style>
