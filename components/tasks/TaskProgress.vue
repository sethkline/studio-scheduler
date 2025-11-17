<template>
  <AppCard>
    <div>
      <div class="flex items-center justify-between mb-2">
        <h3 :class="typography.body.base" class="font-medium">Overall Progress</h3>
        <span :class="typography.body.base" class="font-bold text-primary-600">
          {{ summary.completion_rate }}%
        </span>
      </div>

      <!-- Progress Bar -->
      <div class="relative h-8 bg-gray-200 rounded-lg overflow-hidden">
        <!-- Completed -->
        <div
          v-if="summary.completed > 0"
          class="absolute top-0 left-0 h-full bg-green-500 flex items-center justify-center text-white text-sm font-medium transition-all duration-500"
          :style="{ width: completedPercentage + '%' }"
        >
          <span v-if="completedPercentage > 10">{{ summary.completed }}</span>
        </div>

        <!-- In Progress -->
        <div
          v-if="summary.in_progress > 0"
          class="absolute top-0 h-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium transition-all duration-500"
          :style="{ left: completedPercentage + '%', width: inProgressPercentage + '%' }"
        >
          <span v-if="inProgressPercentage > 10">{{ summary.in_progress }}</span>
        </div>

        <!-- Blocked -->
        <div
          v-if="summary.blocked > 0"
          class="absolute top-0 h-full bg-red-500 flex items-center justify-center text-white text-sm font-medium transition-all duration-500"
          :style="{ left: (completedPercentage + inProgressPercentage) + '%', width: blockedPercentage + '%' }"
        >
          <span v-if="blockedPercentage > 10">{{ summary.blocked }}</span>
        </div>

        <!-- Not Started -->
        <div
          v-if="summary.not_started > 0"
          class="absolute top-0 h-full bg-gray-300 flex items-center justify-center text-gray-700 text-sm font-medium transition-all duration-500"
          :style="{ left: (completedPercentage + inProgressPercentage + blockedPercentage) + '%', width: notStartedPercentage + '%' }"
        >
          <span v-if="notStartedPercentage > 10">{{ summary.not_started }}</span>
        </div>
      </div>

      <!-- Legend -->
      <div class="flex flex-wrap items-center gap-4 mt-3">
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-green-500 rounded"></div>
          <span :class="typography.body.small">Completed ({{ summary.completed }})</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-blue-500 rounded"></div>
          <span :class="typography.body.small">In Progress ({{ summary.in_progress }})</span>
        </div>
        <div v-if="summary.blocked > 0" class="flex items-center gap-2">
          <div class="w-4 h-4 bg-red-500 rounded"></div>
          <span :class="typography.body.small">Blocked ({{ summary.blocked }})</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-gray-300 rounded"></div>
          <span :class="typography.body.small">Not Started ({{ summary.not_started }})</span>
        </div>
      </div>

      <!-- Alerts -->
      <div class="mt-4 space-y-2">
        <!-- Overdue Tasks -->
        <AppAlert v-if="summary.overdue > 0" variant="warning">
          <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ summary.overdue }} task{{ summary.overdue !== 1 ? 's are' : ' is' }} overdue
        </AppAlert>

        <!-- Due This Week -->
        <div v-if="summary.due_this_week > 0" class="flex items-center gap-2 text-sm text-gray-700 bg-blue-50 rounded-lg p-3">
          <svg class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ summary.due_this_week }} task{{ summary.due_this_week !== 1 ? 's' : '' }} due this week</span>
        </div>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { typography } from '~/lib/design-system'
import type { TaskListSummary } from '~/types/tier1-features'

interface Props {
  summary: TaskListSummary
}

const props = defineProps<Props>()

/**
 * Calculate percentages
 */
const completedPercentage = computed(() => {
  if (props.summary.total_tasks === 0) return 0
  return Math.round((props.summary.completed / props.summary.total_tasks) * 100)
})

const inProgressPercentage = computed(() => {
  if (props.summary.total_tasks === 0) return 0
  return Math.round((props.summary.in_progress / props.summary.total_tasks) * 100)
})

const blockedPercentage = computed(() => {
  if (props.summary.total_tasks === 0) return 0
  return Math.round((props.summary.blocked / props.summary.total_tasks) * 100)
})

const notStartedPercentage = computed(() => {
  if (props.summary.total_tasks === 0) return 0
  return Math.round((props.summary.not_started / props.summary.total_tasks) * 100)
})
</script>
