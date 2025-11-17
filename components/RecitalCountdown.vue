<template>
  <Card class="recital-countdown-card">
    <template #content>
      <div class="text-center">
        <h3 class="text-lg font-semibold text-gray-700 mb-4">
          {{ isPast ? 'Show Completed' : 'Time Until Show' }}
        </h3>

        <div v-if="!isPast" class="countdown-display">
          <div class="countdown-segment">
            <div class="countdown-value">{{ displayCountdown.days }}</div>
            <div class="countdown-label">Days</div>
          </div>
          <div class="countdown-separator">:</div>
          <div class="countdown-segment">
            <div class="countdown-value">{{ displayCountdown.hours }}</div>
            <div class="countdown-label">Hours</div>
          </div>
          <div class="countdown-separator">:</div>
          <div class="countdown-segment">
            <div class="countdown-value">{{ displayCountdown.minutes }}</div>
            <div class="countdown-label">Minutes</div>
          </div>
        </div>

        <div v-else class="py-8">
          <i class="pi pi-check-circle text-6xl text-green-500"></i>
          <p class="text-gray-600 mt-3">Show date has passed</p>
        </div>

        <div class="mt-4 pt-4 border-t border-gray-200">
          <p class="text-sm text-gray-600">Show Date</p>
          <p class="text-lg font-semibold text-gray-900">
            {{ formattedDate }}
          </p>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
interface CountdownData {
  days: number
  hours: number
  minutes: number
  isPast: boolean
}

interface Props {
  countdown?: CountdownData
  recitalDate?: string
}

const props = defineProps<Props>()

const displayCountdown = computed(() => {
  if (!props.countdown) {
    return { days: 0, hours: 0, minutes: 0 }
  }

  const hours = props.countdown.hours % 24
  const minutes = props.countdown.minutes % 60

  return {
    days: props.countdown.days,
    hours,
    minutes
  }
})

const isPast = computed(() => props.countdown?.isPast || false)

const formattedDate = computed(() => {
  if (!props.recitalDate) return 'TBD'

  const date = new Date(props.recitalDate)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})
</script>

<style scoped>
.recital-countdown-card {
  @apply h-full;
}

.countdown-display {
  @apply flex items-center justify-center gap-2;
}

.countdown-segment {
  @apply flex flex-col items-center;
}

.countdown-value {
  @apply text-5xl font-bold text-blue-600;
}

.countdown-label {
  @apply text-sm text-gray-600 mt-1 uppercase tracking-wide;
}

.countdown-separator {
  @apply text-4xl font-bold text-gray-400;
}
</style>
