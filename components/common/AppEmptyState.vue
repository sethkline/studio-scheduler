<template>
  <div :class="emptyStates.container">
    <!-- Icon -->
    <div :class="emptyStates.icon">
      <slot name="icon">
        <!-- Default icon if no icon slot provided -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-full h-full"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      </slot>
    </div>

    <!-- Heading -->
    <h3 :class="emptyStates.heading">
      {{ heading }}
    </h3>

    <!-- Description -->
    <p :class="emptyStates.description">
      {{ description }}
    </p>

    <!-- Primary action -->
    <div v-if="$slots.action" :class="emptyStates.action">
      <slot name="action" />
    </div>

    <!-- Secondary action -->
    <div v-if="$slots.secondaryAction" class="mt-3">
      <slot name="secondaryAction" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { emptyStates } from '~/lib/design-system'

/**
 * AppEmptyState Component
 *
 * Displays an empty state with icon, heading, description, and actions.
 * Used when lists, tables, or sections have no data to display.
 *
 * Features:
 * - Customizable icon
 * - Clear heading and description
 * - Primary and secondary action slots
 * - Consistent styling across the app
 *
 * @example
 * <AppEmptyState
 *   heading="No rehearsals scheduled"
 *   description="Get started by creating your first rehearsal"
 * >
 *   <template #icon>
 *     <CalendarIcon />
 *   </template>
 *   <template #action>
 *     <AppButton @click="createRehearsal">Create Rehearsal</AppButton>
 *   </template>
 * </AppEmptyState>
 */

interface Props {
  /**
   * Heading text
   */
  heading: string

  /**
   * Description text
   */
  description: string
}

defineProps<Props>()
</script>
