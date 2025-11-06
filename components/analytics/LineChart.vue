<template>
  <div class="w-full">
    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
    <div v-else-if="error" class="text-center text-red-600 p-4">
      {{ error }}
    </div>
    <div v-else>
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type ChartData
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Dataset {
  label: string
  data: number[]
  borderColor?: string
  backgroundColor?: string
  fill?: boolean
  tension?: number
}

interface Props {
  labels: string[]
  datasets: Dataset[]
  title?: string
  loading?: boolean
  error?: string
  height?: number
  showLegend?: boolean
  showGrid?: boolean
  fill?: boolean
  tension?: number
}

const props = withDefaults(defineProps<Props>(), {
  height: 300,
  showLegend: true,
  showGrid: true,
  fill: false,
  tension: 0.4
})

// Default colors for datasets
const defaultColors = [
  { border: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' },
  { border: '#10b981', background: 'rgba(16, 185, 129, 0.1)' },
  { border: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' },
  { border: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' },
  { border: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)' }
]

const chartData = computed<ChartData<'line'>>(() => ({
  labels: props.labels,
  datasets: props.datasets.map((dataset, index) => {
    const colors = defaultColors[index % defaultColors.length]
    return {
      label: dataset.label,
      data: dataset.data,
      borderColor: dataset.borderColor || colors.border,
      backgroundColor: dataset.backgroundColor || colors.background,
      fill: dataset.fill !== undefined ? dataset.fill : props.fill,
      tension: dataset.tension !== undefined ? dataset.tension : props.tension,
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: dataset.borderColor || colors.border,
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    }
  })
}))

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: props.showLegend,
      position: 'bottom',
      labels: {
        usePointStyle: true,
        padding: 15,
        font: {
          size: 12
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
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFont: {
        size: 13
      },
      bodyFont: {
        size: 12
      },
      padding: 12,
      cornerRadius: 8,
      displayColors: true
    }
  },
  scales: {
    x: {
      grid: {
        display: props.showGrid,
        color: 'rgba(0, 0, 0, 0.05)'
      },
      ticks: {
        font: {
          size: 11
        }
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        display: props.showGrid,
        color: 'rgba(0, 0, 0, 0.05)'
      },
      ticks: {
        font: {
          size: 11
        }
      }
    }
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false
  }
}))
</script>

<style scoped>
/* Chart container */
div {
  position: relative;
}
</style>
