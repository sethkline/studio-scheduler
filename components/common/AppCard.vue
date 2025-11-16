<template>
  <div :class="cardClasses">
    <!-- Card header -->
    <div
      v-if="$slots.header || title"
      class="border-b border-gray-200 px-6 py-4"
    >
      <slot name="header">
        <div class="flex items-center justify-between">
          <h3 :class="typography.heading.h3">
            {{ title }}
          </h3>
          <div v-if="$slots.actions">
            <slot name="actions" />
          </div>
        </div>
      </slot>
    </div>

    <!-- Card body -->
    <div :class="bodyClasses">
      <slot />
    </div>

    <!-- Card footer -->
    <div
      v-if="$slots.footer"
      class="border-t border-gray-200 px-6 py-4 bg-gray-50"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { containers, typography } from '~/lib/design-system'

/**
 * AppCard Component
 *
 * A container component for grouping related content.
 * Provides header, body, and footer slots with consistent styling.
 *
 * Features:
 * - Optional header with title and actions
 * - Flexible body content
 * - Optional footer
 * - Hover effect (optional)
 * - Clickable state (optional)
 *
 * @example
 * <AppCard title="Student Details">
 *   <p>Card content goes here</p>
 * </AppCard>
 *
 * @example
 * <AppCard hoverable clickable @click="handleClick">
 *   <template #header>
 *     <h3>Custom Header</h3>
 *   </template>
 *   <template #default>
 *     <p>Body content</p>
 *   </template>
 *   <template #footer>
 *     <AppButton>Action</AppButton>
 *   </template>
 * </AppCard>
 */

interface Props {
  /**
   * Card title (displayed in header)
   */
  title?: string

  /**
   * Enable hover effect
   * @default false
   */
  hoverable?: boolean

  /**
   * Make card clickable (adds cursor pointer)
   * @default false
   */
  clickable?: boolean

  /**
   * Remove default padding from body
   * @default false
   */
  noPadding?: boolean

  /**
   * Use flat style (no shadow)
   * @default false
   */
  flat?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hoverable: false,
  clickable: false,
  noPadding: false,
  flat: false,
})

const cardClasses = computed(() => {
  const classes = [containers.card.base]

  if (!props.flat) {
    classes.push('shadow-md')
  }

  if (props.hoverable) {
    classes.push(containers.card.hover)
  }

  if (props.clickable) {
    classes.push('cursor-pointer')
  }

  return classes.join(' ')
})

const bodyClasses = computed(() => {
  return props.noPadding ? '' : containers.card.padding
})
</script>
