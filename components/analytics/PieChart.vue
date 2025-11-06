<template>
  <div class="w-full">
    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
    <div v-else-if="error" class="text-center text-red-600 p-4">
      {{ error }}
    </div>
    <div v-else class="flex items-center justify-center">
      <div :style="{ maxWidth: `${maxWidth}px` }">
        <Doughnut v-if="doughnut" :data="chartData" :options="chartOptions" />
        <Pie v-else :data="chartData" :options="chartOptions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Pie, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartData
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface Props {
  labels: string[]
  data: number[]
  title?: string
  loading?: boolean
  error?: string
  backgroundColor?: string[]
  showLegend?: boolean
  doughnut?: boolean
  maxWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  showLegend: true,
  doughnut: true,
  maxWidth: 400
})

// Default color palette
const defaultBackgroundColors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16'  // lime
]

const chartData = computed<ChartData<'pie' | 'doughnut'>>(() => ({
  labels: props.labels,
  datasets: [
    {
      data: props.data,
      backgroundColor: props.backgroundColor || defaultBackgroundColors.slice(0, props.data.length),
      borderWidth: 2,
      borderColor: '#fff',
      hoverOffset: 4,
      hoverBorderWidth: 3
    }
  ]
}))

const chartOptions = computed<ChartOptions<'pie' | 'doughnut'>>(() => ({
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: props.showLegend,
      position: 'bottom',
      labels: {
        usePointStyle: true,
        padding: 15,
        font: {
          size: 12
        },
        generateLabels: (chart) => {
          const data = chart.data
          if (data.labels && data.datasets) {
            return data.labels.map((label, i) => {
              const value = data.datasets[0].data[i] as number
              const total = (data.datasets[0].data as number[]).reduce((a, b) => a + b, 0)
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
              return {
                text: `${label} (${percentage}%)`,
                fillStyle: (data.datasets[0].backgroundColor as string[])[i],
                hidden: false,
                index: i
              }
            })
          }
          return []
        }
      }
    },
    title: {
      display: !!props.title,
      text: props.title,
      font: {
        size: 16,
        weight: 'bold'
      },
      padding: {
        bottom: 20
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFont: {
        size: 13
      },
      bodyFont: {
        size: 12
      },
      padding: 12,
      cornerRadius: 8,
      displayColors: true,
      callbacks: {
        label: (context) => {
          const label = context.label || ''
          const value = context.parsed || 0
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0) as number
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
          return `${label}: ${value.toLocaleString()} (${percentage}%)`
        }
      }
    }
  },
  cutout: props.doughnut ? '65%' : undefined
}))
</script>

<style scoped>
/* Chart container */
div {
  position: relative;
}
</style>
