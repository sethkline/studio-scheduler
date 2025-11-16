<template>
  <component
    :is="as"
    :type="as === 'button' ? nativeType : undefined"
    :disabled="isDisabled"
    :aria-label="ariaLabel"
    :aria-busy="loading"
    :aria-disabled="isDisabled"
    :class="buttonClasses"
    @click="handleClick"
    @keydown.enter.prevent="handleEnter"
    @keydown.space.prevent="handleSpace"
  >
    <!-- Loading spinner -->
    <span
      v-if="loading"
      class="inline-flex items-center mr-2"
      aria-hidden="true"
    >
      <svg
        class="animate-spin h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </span>

    <!-- Leading icon -->
    <span
      v-if="$slots.icon && !loading"
      class="inline-flex items-center"
      :class="{ 'mr-2': $slots.default }"
      aria-hidden="true"
    >
      <slot name="icon" />
    </span>

    <!-- Button text -->
    <span v-if="$slots.default">
      <slot />
    </span>

    <!-- Trailing icon -->
    <span
      v-if="$slots.iconRight"
      class="inline-flex items-center ml-2"
      aria-hidden="true"
    >
      <slot name="iconRight" />
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getButtonClasses } from '~/lib/design-system'

/**
 * AppButton Component
 *
 * A fully accessible button component with multiple variants, sizes, and states.
 * Implements WCAG 2.1 AA accessibility standards.
 *
 * Features:
 * - Multiple visual variants (primary, secondary, danger, ghost, success)
 * - Three size options (sm, md, lg) with proper touch targets
 * - Loading state with spinner
 * - Disabled state
 * - Full keyboard navigation support
 * - ARIA labels and live regions
 * - Icon support (leading and trailing)
 *
 * @example
 * <AppButton variant="primary" size="md" @click="handleSave">
 *   Save Changes
 * </AppButton>
 *
 * @example
 * <AppButton variant="danger" :loading="isDeleting" @click="handleDelete">
 *   <template #icon>
 *     <TrashIcon class="h-4 w-4" />
 *   </template>
 *   Delete Item
 * </AppButton>
 */

interface Props {
  /**
   * Visual variant of the button
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'

  /**
   * Size of the button (affects padding and minimum touch target)
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Whether the button is in a loading state
   * Shows spinner and disables interaction
   * @default false
   */
  loading?: boolean

  /**
   * Whether the button is disabled
   * @default false
   */
  disabled?: boolean

  /**
   * HTML element type to render
   * Use 'a' for links, 'button' for actions
   * @default 'button'
   */
  as?: 'button' | 'a'

  /**
   * Native button type (only applies when as="button")
   * @default 'button'
   */
  nativeType?: 'button' | 'submit' | 'reset'

  /**
   * ARIA label for accessibility
   * Use when button has no text (icon-only)
   */
  ariaLabel?: string

  /**
   * Full width button
   * @default false
   */
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  as: 'button',
  nativeType: 'button',
  fullWidth: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

/**
 * Button is disabled if explicitly disabled OR currently loading
 */
const isDisabled = computed(() => props.disabled || props.loading)

/**
 * Compute button classes based on props
 */
const buttonClasses = computed(() => {
  const classes = getButtonClasses(
    props.variant,
    props.size,
    props.loading,
    isDisabled.value
  )

  return `${classes} ${props.fullWidth ? 'w-full' : ''}`
})

/**
 * Handle click events
 * Prevents action if button is disabled or loading
 */
function handleClick(event: MouseEvent) {
  if (isDisabled.value) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  emit('click', event)
}

/**
 * Handle Enter key press
 * Provides keyboard accessibility
 */
function handleEnter(event: KeyboardEvent) {
  if (isDisabled.value) {
    event.preventDefault()
    return
  }

  // Trigger click event for Enter key
  const target = event.target as HTMLElement
  target.click()
}

/**
 * Handle Space key press
 * Provides keyboard accessibility
 */
function handleSpace(event: KeyboardEvent) {
  if (isDisabled.value) {
    event.preventDefault()
    return
  }

  // Trigger click event for Space key
  const target = event.target as HTMLElement
  target.click()
}
</script>

<style scoped>
/*
 * Additional button styles that can't be easily expressed in Tailwind
 * Most styling is handled via the design system classes
 */

/* Ensure loading spinner is visible in all variants */
button[aria-busy="true"] svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Focus visible for keyboard navigation */
button:focus-visible,
a:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
</style>
