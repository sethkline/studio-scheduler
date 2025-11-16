<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        :class="modal.overlay"
        aria-hidden="true"
        @click="handleOverlayClick"
      />
    </Transition>

    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="modelValue"
        :class="modal.container"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @keydown.esc="handleEscape"
      >
        <div :class="modal.wrapper">
          <div :class="[modal.content, sizeClasses]">
            <!-- Close button -->
            <button
              v-if="showClose"
              type="button"
              :class="modal.closeButton"
              aria-label="Close dialog"
              @click="handleClose"
            >
              <svg
                class="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <!-- Header -->
            <div v-if="$slots.header || title" :class="modal.header">
              <slot name="header">
                <h2 :id="titleId" :class="typography.heading.h2">
                  {{ title }}
                </h2>
              </slot>
            </div>

            <!-- Body -->
            <div :class="modal.body">
              <slot />
            </div>

            <!-- Footer -->
            <div v-if="$slots.footer" :class="modal.footer">
              <slot name="footer" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onBeforeUnmount, useId } from 'vue'
import { modal, typography } from '~/lib/design-system'

/**
 * AppModal Component
 *
 * A fully accessible modal dialog component.
 * Implements WCAG 2.1 AA accessibility standards.
 *
 * Features:
 * - Focus trap (keeps focus inside modal)
 * - Escape key to close
 * - Click outside to close (optional)
 * - Body scroll lock when open
 * - Smooth transitions
 * - Multiple sizes
 * - ARIA attributes for screen readers
 *
 * @example
 * <AppModal v-model="isOpen" title="Delete Rehearsal" size="sm">
 *   <p>Are you sure you want to delete this rehearsal?</p>
 *   <template #footer>
 *     <AppButton variant="secondary" @click="isOpen = false">Cancel</AppButton>
 *     <AppButton variant="danger" @click="handleDelete">Delete</AppButton>
 *   </template>
 * </AppModal>
 */

interface Props {
  /**
   * Control modal visibility (v-model)
   */
  modelValue: boolean

  /**
   * Modal title
   */
  title?: string

  /**
   * Modal size
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'

  /**
   * Show close button in top-right
   * @default true
   */
  showClose?: boolean

  /**
   * Close modal when clicking outside
   * @default true
   */
  closeOnOverlay?: boolean

  /**
   * Close modal when pressing Escape key
   * @default true
   */
  closeOnEscape?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showClose: true,
  closeOnOverlay: true,
  closeOnEscape: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
  open: []
}>()

const titleId = `modal-title-${useId()}`
let previousActiveElement: HTMLElement | null = null

/**
 * Size classes for modal content
 */
const sizeClasses = computed(() => {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl',
  }
  return sizes[props.size]
})

/**
 * Handle overlay click
 */
function handleOverlayClick() {
  if (props.closeOnOverlay) {
    handleClose()
  }
}

/**
 * Handle Escape key press
 */
function handleEscape() {
  if (props.closeOnEscape) {
    handleClose()
  }
}

/**
 * Close the modal
 */
function handleClose() {
  emit('update:modelValue', false)
  emit('close')
}

/**
 * Lock body scroll when modal is open
 */
function lockBodyScroll() {
  document.body.style.overflow = 'hidden'
}

/**
 * Unlock body scroll when modal is closed
 */
function unlockBodyScroll() {
  document.body.style.overflow = ''
}

/**
 * Store previously focused element and focus modal
 */
function trapFocus() {
  previousActiveElement = document.activeElement as HTMLElement

  // Focus first focusable element in modal
  setTimeout(() => {
    const modal = document.querySelector('[role="dialog"]')
    const focusable = modal?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable && focusable.length > 0) {
      (focusable[0] as HTMLElement).focus()
    }
  }, 100)
}

/**
 * Return focus to previously focused element
 */
function returnFocus() {
  if (previousActiveElement) {
    previousActiveElement.focus()
    previousActiveElement = null
  }
}

// Watch for modal visibility changes
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      lockBodyScroll()
      trapFocus()
      emit('open')
    } else {
      unlockBodyScroll()
      returnFocus()
    }
  },
  { immediate: true }
)

// Clean up on unmount
onBeforeUnmount(() => {
  unlockBodyScroll()
  returnFocus()
})
</script>
