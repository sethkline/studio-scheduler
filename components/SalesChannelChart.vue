<template>
  <Card>
    <template #content>
      <div>
        <h3 class="text-lg font-semibold text-gray-700 mb-4">Sales by Channel</h3>

        <div v-if="!data || data.length === 0" class="text-center py-8 text-gray-500">
          <i class="pi pi-chart-pie text-4xl mb-3"></i>
          <p>No channel data available yet</p>
        </div>

        <div v-else>
          <div class="chart-container mb-4">
            <canvas ref="chartCanvas"></canvas>
          </div>

          <!-- Channel Legend -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              v-for="(channel, index) in data"
              :key="channel.channel"
              class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div
                class="w-4 h-4 rounded-full flex-shrink-0"
                :style="{ backgroundColor: getChannelColor(index) }"
              ></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 capitalize">{{ channel.channel }}</p>
                <p class="text-xs text-gray-600">
                  {{ channel.orders }} orders ({{ channel.percentage }}%)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

interface ChannelData {
  channel: string
  orders: number
  revenue: number
  percentage: number
}

interface Props {
  data?: ChannelData[]
}

const props = defineProps<Props>()

const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const channelColors = [
  'rgb(59, 130, 246)',   // blue - online
  'rgb(168, 85, 247)',   // purple - box office
  'rgb(34, 197, 94)',    // green - phone
  'rgb(251, 146, 60)'    // orange - other
]

const getChannelColor = (index: number) => {
  return channelColors[index % channelColors.length]
}

const createChart = () => {
  if (!chartCanvas.value || !props.data || props.data.length === 0) return

  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy()
  }

  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return

  const labels = props.data.map(d => d.channel.charAt(0).toUpperCase() + d.channel.slice(1))
  const values = props.data.map(d => d.orders)

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: channelColors.slice(0, props.data.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || ''
              const value = context.parsed
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
              const percentage = total > 0 ? Math.round((value / total) * 100) : 0
              return `${label}: ${value} orders (${percentage}%)`
            }
          }
        }
      }
    }
  })
}

watch(() => props.data, () => {
  createChart()
}, { deep: true })

onMounted(() => {
  createChart()
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})
</script>

<style scoped>
.chart-container {
  @apply relative h-48;
}
</style>
