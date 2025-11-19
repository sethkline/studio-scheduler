<template>
  <Card>
    <template #content>
      <div>
        <h3 class="text-lg font-semibold text-gray-700 mb-4">Peak Sales Hours</h3>

        <div v-if="!hours || hours.length === 0" class="text-center py-8 text-gray-500">
          <i class="pi pi-clock text-4xl mb-3"></i>
          <p>No peak hour data available</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="hour in hours"
            :key="hour.hour_of_day"
            class="flex items-center gap-3"
          >
            <div class="flex-shrink-0 w-20 text-right">
              <span class="text-sm font-semibold text-gray-900">
                {{ formatHour(hour.hour_of_day) }}
              </span>
            </div>
            <div class="flex-1">
              <div class="relative">
                <div class="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                  <div
                    class="h-full bg-blue-600 flex items-center justify-end px-2 transition-all duration-500"
                    :style="{ width: `${getPercentageWidth(hour)}%` }"
                  >
                    <span class="text-white text-xs font-semibold">
                      {{ hour.order_count }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex-shrink-0 w-20 text-right">
              <span class="text-xs text-gray-600">
                {{ formatCurrency(hour.total_revenue) }}
              </span>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-200">
            <p class="text-sm text-gray-600">
              <i class="pi pi-info-circle mr-2"></i>
              Use this data to optimize your email marketing timing
            </p>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
interface PeakHour {
  hour_of_day: number
  order_count: number
  total_revenue: number
}

interface Props {
  hours?: PeakHour[]
}

const props = defineProps<Props>()

const maxOrders = computed(() => {
  return Math.max(...(props.hours?.map(h => h.order_count) || [1]))
})

const getPercentageWidth = (hour: PeakHour) => {
  return (hour.order_count / maxOrders.value) * 100
}

const formatHour = (hour: number) => {
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour} ${ampm}`
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}
</script>

<style scoped>
/* Styles are inline with Tailwind classes */
</style>
