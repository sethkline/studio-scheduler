<template>
  <Card class="overall-progress-card">
    <template #content>
      <div class="text-center">
        <h3 class="text-lg font-semibold text-gray-700 mb-4">Overall Progress</h3>

        <!-- Circular Progress -->
        <div class="relative inline-flex items-center justify-center mb-6">
          <svg class="progress-ring" width="160" height="160">
            <circle
              class="progress-ring-circle-bg"
              stroke="#e5e7eb"
              stroke-width="12"
              fill="transparent"
              r="70"
              cx="80"
              cy="80"
            />
            <circle
              class="progress-ring-circle"
              :stroke="progressColor"
              stroke-width="12"
              fill="transparent"
              r="70"
              cx="80"
              cy="80"
              :style="{ strokeDashoffset: strokeDashoffset }"
            />
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center">
              <div class="text-4xl font-bold" :class="progressColor.replace('rgb', 'text')">
                {{ displayCompletion }}%
              </div>
              <div class="text-sm text-gray-600">Complete</div>
            </div>
          </div>
        </div>

        <!-- At-Risk Items -->
        <div v-if="atRiskItems && atRiskItems.length > 0" class="mt-4 pt-4 border-t border-gray-200">
          <h4 class="text-sm font-semibold text-red-700 mb-2 flex items-center justify-center gap-2">
            <i class="pi pi-exclamation-triangle"></i>
            Attention Required
          </h4>
          <div class="space-y-2">
            <div
              v-for="item in atRiskItems"
              :key="item.type"
              class="text-sm p-2 rounded"
              :class="getSeverityClass(item.severity)"
            >
              {{ item.message }}
            </div>
          </div>
        </div>

        <div v-else class="mt-4 pt-4 border-t border-gray-200">
          <div class="flex items-center justify-center gap-2 text-green-700">
            <i class="pi pi-check-circle"></i>
            <span class="text-sm font-semibold">On Track!</span>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
interface AtRiskItem {
  type: string
  severity: 'low' | 'medium' | 'high'
  message: string
  count: number
}

interface Props {
  completion?: number
  atRiskItems?: AtRiskItem[]
}

const props = withDefaults(defineProps<Props>(), {
  completion: 0,
  atRiskItems: () => []
})

const displayCompletion = computed(() => {
  return Math.round(props.completion || 0)
})

const progressColor = computed(() => {
  const completion = displayCompletion.value
  if (completion >= 80) return 'rgb(34, 197, 94)' // green
  if (completion >= 60) return 'rgb(59, 130, 246)' // blue
  if (completion >= 40) return 'rgb(251, 146, 60)' // orange
  return 'rgb(239, 68, 68)' // red
})

const strokeDashoffset = computed(() => {
  const radius = 70
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (displayCompletion.value / 100) * circumference
  return offset
})

const getSeverityClass = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'bg-red-100 text-red-800 border border-red-200'
    case 'medium':
      return 'bg-orange-100 text-orange-800 border border-orange-200'
    case 'low':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200'
  }
}
</script>

<style scoped>
.overall-progress-card {
  @apply h-full;
}

.progress-ring {
  transform: rotate(-90deg);
}

.progress-ring-circle {
  stroke-dasharray: 439.8; /* 2 * PI * 70 */
  transition: stroke-dashoffset 0.35s;
  stroke-linecap: round;
}
</style>
