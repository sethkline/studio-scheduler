<template>
  <Card>
    <template #content>
      <div>
        <h3 class="text-lg font-semibold text-gray-700 mb-6">Progress Overview</h3>

        <div class="space-y-6">
          <!-- Tasks Progress -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <i class="pi pi-check-square text-blue-600"></i>
                <span class="font-semibold text-gray-900">Tasks</span>
              </div>
              <span class="text-sm text-gray-600">
                {{ progress?.tasks?.completed || 0 }} of {{ progress?.tasks?.total || 0 }} complete
              </span>
            </div>
            <div class="progress-bar-container">
              <div
                class="progress-bar"
                :class="getProgressColor(progress?.tasks?.percentage)"
                :style="{ width: `${progress?.tasks?.percentage || 0}%` }"
              >
                <span class="progress-label">{{ progress?.tasks?.percentage || 0 }}%</span>
              </div>
            </div>
            <div v-if="progress?.tasks?.overdue" class="mt-1 text-sm text-red-600 flex items-center gap-1">
              <i class="pi pi-exclamation-triangle text-xs"></i>
              {{ progress.tasks.overdue }} overdue task{{ progress.tasks.overdue > 1 ? 's' : '' }}
            </div>
          </div>

          <!-- Volunteers Progress -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <i class="pi pi-users text-purple-600"></i>
                <span class="font-semibold text-gray-900">Volunteer Spots</span>
              </div>
              <span class="text-sm text-gray-600">
                {{ progress?.volunteers?.filled || 0 }} of {{ progress?.volunteers?.total || 0 }} filled
              </span>
            </div>
            <div class="progress-bar-container">
              <div
                class="progress-bar"
                :class="getProgressColor(progress?.volunteers?.percentage)"
                :style="{ width: `${progress?.volunteers?.percentage || 0}%` }"
              >
                <span class="progress-label">{{ progress?.volunteers?.percentage || 0 }}%</span>
              </div>
            </div>
            <div v-if="progress?.volunteers?.unfilled" class="mt-1 text-sm text-gray-600">
              {{ progress.volunteers.unfilled }} spot{{ progress.volunteers.unfilled > 1 ? 's' : '' }} remaining
            </div>
          </div>

          <!-- Ticket Sales Progress (if goal exists) -->
          <div v-if="ticketGoal">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <i class="pi pi-ticket text-green-600"></i>
                <span class="font-semibold text-gray-900">Ticket Sales</span>
              </div>
              <span class="text-sm text-gray-600">
                {{ progress?.tickets?.sold || 0 }} of {{ ticketGoal }} tickets
              </span>
            </div>
            <div class="progress-bar-container">
              <div
                class="progress-bar"
                :class="getProgressColor(ticketSalesPercentage)"
                :style="{ width: `${ticketSalesPercentage}%` }"
              >
                <span class="progress-label">{{ ticketSalesPercentage }}%</span>
              </div>
            </div>
            <div class="mt-1 text-sm text-gray-600">
              {{ formatCurrency(progress?.tickets?.revenue) }} total revenue
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
interface Progress {
  tasks?: {
    completed: number
    total: number
    percentage: number
    overdue: number
  }
  volunteers?: {
    filled: number
    total: number
    percentage: number
    unfilled: number
  }
  tickets?: {
    sold: number
    revenue: number
  }
}

interface Props {
  progress?: Progress
  ticketGoal?: number
}

const props = defineProps<Props>()

const ticketSalesPercentage = computed(() => {
  if (!props.ticketGoal || !props.progress?.tickets?.sold) return 0
  return Math.min(100, Math.round((props.progress.tickets.sold / props.ticketGoal) * 100))
})

const getProgressColor = (percentage?: number) => {
  const pct = percentage || 0
  if (pct >= 80) return 'bg-green-600'
  if (pct >= 60) return 'bg-blue-600'
  if (pct >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

const formatCurrency = (value?: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0)
}
</script>

<style scoped>
.progress-bar-container {
  @apply w-full bg-gray-200 rounded-full h-8 overflow-hidden;
}

.progress-bar {
  @apply h-full transition-all duration-500 ease-out flex items-center justify-end px-3 text-white font-semibold text-sm;
  min-width: 2rem;
}

.progress-label {
  @apply drop-shadow-sm;
}
</style>
