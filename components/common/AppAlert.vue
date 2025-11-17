<template>
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      :class="alertClasses"
      role="alert"
      :aria-live="variant === 'error' ? 'assertive' : 'polite'"
    >
      <!-- Icon -->
      <div :class="alerts.icon">
        <slot name="icon">
          <!-- Success icon -->
          <svg
            v-if="variant === 'success'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clip-rule="evenodd"
            />
          </svg>

          <!-- Error icon -->
          <svg
            v-else-if="variant === 'error'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clip-rule="evenodd"
            />
          </svg>

          <!-- Warning icon -->
          <svg
            v-else-if="variant === 'warning'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clip-rule="evenodd"
            />
          </svg>

          <!-- Info icon -->
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
              clip-rule="evenodd"
            />
          </svg>
        </slot>
      </div>

      <!-- Content -->
      <div :class="alerts.content">
        <!-- Title -->
        <p v-if="title" :class="alerts.title">
          {{ title }}
        </p>

        <!-- Description -->
        <div v-if="description || $slots.default" :class="alerts.description">
          <slot>{{ description }}</slot>
        </div>
      </div>

      <!-- Close button -->
      <button
        v-if="dismissible"
        type="button"
        :class="alerts.closeButton"
        aria-label="Close alert"
        @click="handleClose"
      >
        <svg
          class="h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
          />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getAlertClasses, alerts } from '~/lib/design-system'

/**
 * AppAlert Component
 *
 * Displays informational, success, warning, or error messages.
 * Can be used inline or as a toast notification.
 *
 * Features:
 * - Multiple variants (success, error, warning, info)
 * - Optional title and description
 * - Dismissible with close button
 * - Auto-dismiss with timeout
 * - Smooth fade transitions
 * - ARIA live regions for accessibility
 *
 * @example
 * <AppAlert
 *   variant="success"
 *   title="Payment received"
 *   description="Receipt sent to parent@example.com"
 *   dismissible
 * />
 *
 * @example
 * <AppAlert variant="error" dismissible :auto-dismiss="5000">
 *   Failed to send email - Check connection
 * </AppAlert>
 */

interface Props {
  /**
   * Alert variant
   * @default 'info'
   */
  variant?: 'success' | 'error' | 'warning' | 'info'

  /**
   * Alert title
   */
  title?: string

  /**
   * Alert description (or use default slot)
   */
  description?: string

  /**
   * Show close button
   * @default false
   */
  dismissible?: boolean

  /**
   * Auto-dismiss after milliseconds (0 = no auto-dismiss)
   * @default 0
   */
  autoDismiss?: number

  /**
   * Control visibility externally
   * @default true
   */
  modelValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info',
  dismissible: false,
  autoDismiss: 0,
  modelValue: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const visible = ref(props.modelValue)
let dismissTimeout: ReturnType<typeof setTimeout> | null = null

// Watch for external visibility changes
watch(
  () => props.modelValue,
  (newValue) => {
    visible.value = newValue
    if (newValue && props.autoDismiss > 0) {
      startAutoDismiss()
    }
  }
)

// Compute alert classes
const alertClasses = computed(() => getAlertClasses(props.variant))

/**
 * Handle close button click
 */
function handleClose() {
  visible.value = false
  emit('update:modelValue', false)
  emit('close')

  if (dismissTimeout) {
    clearTimeout(dismissTimeout)
    dismissTimeout = null
  }
}

/**
 * Start auto-dismiss timer
 */
function startAutoDismiss() {
  if (dismissTimeout) {
    clearTimeout(dismissTimeout)
  }

  if (props.autoDismiss > 0) {
    dismissTimeout = setTimeout(() => {
      handleClose()
    }, props.autoDismiss)
  }
}

// Start auto-dismiss on mount if enabled
onMounted(() => {
  if (visible.value && props.autoDismiss > 0) {
    startAutoDismiss()
  }
})

// Clean up timeout on unmount
onBeforeUnmount(() => {
  if (dismissTimeout) {
    clearTimeout(dismissTimeout)
  }
})
</script>
