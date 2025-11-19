<template>
  <div class="w-full">
    <!-- Label -->
    <label
      v-if="label"
      :for="inputId"
      :class="[inputs.label, required && 'after:content-[\'*\'] after:ml-0.5 after:text-red-500']"
    >
      {{ label }}
    </label>

    <!-- Input container -->
    <div class="relative">
      <!-- Leading icon -->
      <div
        v-if="$slots.iconLeft"
        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
      >
        <span class="text-gray-400" aria-hidden="true">
          <slot name="iconLeft" />
        </span>
      </div>

      <!-- Input element -->
      <input
        :id="inputId"
        ref="inputRef"
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :autocomplete="autocomplete"
        :aria-label="ariaLabel || label"
        :aria-describedby="ariaDescribedBy"
        :aria-invalid="hasError"
        :aria-required="required"
        :class="inputClasses"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
        @keydown.enter="handleEnter"
      />

      <!-- Trailing icon or validation indicator -->
      <div
        v-if="$slots.iconRight || showValidationIcon"
        class="absolute inset-y-0 right-0 pr-3 flex items-center"
      >
        <!-- Success indicator -->
        <span
          v-if="showSuccess && !hasError"
          class="text-green-500"
          aria-hidden="true"
        >
          <svg
            class="h-5 w-5"
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
        </span>

        <!-- Error indicator -->
        <span
          v-else-if="hasError"
          class="text-red-500"
          aria-hidden="true"
        >
          <svg
            class="h-5 w-5"
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
        </span>

        <!-- Custom trailing icon -->
        <span
          v-else-if="$slots.iconRight"
          class="text-gray-400"
          aria-hidden="true"
        >
          <slot name="iconRight" />
        </span>
      </div>
    </div>

    <!-- Help text -->
    <p
      v-if="helpText && !hasError"
      :id="`${inputId}-help`"
      :class="inputs.helpText"
    >
      {{ helpText }}
    </p>

    <!-- Error message -->
    <div
      v-if="hasError"
      :id="`${inputId}-error`"
      :class="inputs.errorText"
      role="alert"
      aria-live="polite"
    >
      <svg
        class="h-4 w-4 flex-shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
          clip-rule="evenodd"
        />
      </svg>
      <span>{{ errorMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { getInputClasses, inputs } from '~/lib/design-system'

/**
 * AppInput Component
 *
 * A fully accessible text input component with validation states.
 * Implements WCAG 2.1 AA accessibility standards.
 *
 * Features:
 * - Multiple input types (text, email, password, tel, number, etc.)
 * - Validation states (default, error, success)
 * - Help text and error messages
 * - Icon support (leading and trailing)
 * - Keyboard navigation
 * - ARIA labels and live regions
 * - Auto-focusing on mount (optional)
 * - Required field indicator
 *
 * @example
 * <AppInput
 *   v-model="email"
 *   label="Email Address"
 *   type="email"
 *   placeholder="name@example.com"
 *   help-text="We'll never share your email"
 *   required
 * />
 *
 * @example
 * <AppInput
 *   v-model="password"
 *   label="Password"
 *   type="password"
 *   :error-message="passwordError"
 *   @blur="validatePassword"
 * />
 */

interface Props {
  /**
   * Input value (v-model)
   */
  modelValue?: string | number

  /**
   * Label text
   */
  label?: string

  /**
   * Input type
   * @default 'text'
   */
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'url' | 'search' | 'date' | 'time' | 'datetime-local'

  /**
   * Placeholder text
   */
  placeholder?: string

  /**
   * Help text shown below input
   */
  helpText?: string

  /**
   * Error message to display
   * When present, input shows error state
   */
  errorMessage?: string

  /**
   * Whether input is disabled
   * @default false
   */
  disabled?: boolean

  /**
   * Whether input is readonly
   * @default false
   */
  readonly?: boolean

  /**
   * Whether input is required
   * @default false
   */
  required?: boolean

  /**
   * Autocomplete attribute
   */
  autocomplete?: string

  /**
   * ARIA label (use when label is not visible)
   */
  ariaLabel?: string

  /**
   * Show success checkmark when valid
   * @default false
   */
  showSuccess?: boolean

  /**
   * Auto-focus on mount
   * @default false
   */
  autofocus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  readonly: false,
  required: false,
  showSuccess: false,
  autofocus: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
  enter: [event: KeyboardEvent]
}>()

// Generate unique ID for accessibility
const inputId = `input-${useId()}`
const inputRef = ref<HTMLInputElement>()

/**
 * Check if input has an error
 */
const hasError = computed(() => !!props.errorMessage)

/**
 * Determine input type (reactive for show/hide password)
 */
const inputType = computed(() => props.type)

/**
 * Show validation icons (success or error)
 */
const showValidationIcon = computed(() => {
  return (props.showSuccess && !hasError.value) || hasError.value
})

/**
 * Compute input state for styling
 */
const inputState = computed<'default' | 'error' | 'success'>(() => {
  if (hasError.value) return 'error'
  if (props.showSuccess) return 'success'
  return 'default'
})

/**
 * Compute input classes based on state
 */
const inputClasses = computed(() => {
  const baseClasses = getInputClasses(inputState.value, props.disabled)

  // Add padding for icons
  const iconClasses = []
  if (props.slots?.iconLeft) iconClasses.push('pl-10')
  if (props.slots?.iconRight || showValidationIcon.value) iconClasses.push('pr-10')

  return `${baseClasses} ${iconClasses.join(' ')}`
})

/**
 * Compute ARIA describedby attribute
 */
const ariaDescribedBy = computed(() => {
  const ids = []
  if (props.helpText && !hasError.value) ids.push(`${inputId}-help`)
  if (hasError.value) ids.push(`${inputId}-error`)
  return ids.length > 0 ? ids.join(' ') : undefined
})

/**
 * Handle input event
 */
function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  emit('update:modelValue', value)
}

/**
 * Handle blur event
 */
function handleBlur(event: FocusEvent) {
  emit('blur', event)
}

/**
 * Handle focus event
 */
function handleFocus(event: FocusEvent) {
  emit('focus', event)
}

/**
 * Handle Enter key press
 */
function handleEnter(event: KeyboardEvent) {
  emit('enter', event)
}

/**
 * Expose focus method for parent components
 */
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
})

// Auto-focus on mount if requested
onMounted(() => {
  if (props.autofocus) {
    inputRef.value?.focus()
  }
})
</script>

<style scoped>
/* Additional input styles */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>
