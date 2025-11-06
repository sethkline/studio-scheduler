<template>
  <div class="w-full">
    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
    <div v-else-if="error" class="text-center text-red-600 p-4">
      {{ error }}
    </div>
    <div v-else>
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartData
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface Dataset {
  label: string
  data: number[]
  backgroundColor?: string | string[]
  borderColor?: string | string[]
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
  horizontal?: boolean
  stacked?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: 300,
  showLegend: true,
  showGrid: true,
  horizontal: false,
  stacked: false
})

// Default colors for datasets
const defaultColors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316'  // orange
]

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: props.labels,
  datasets: props.datasets.map((dataset, index) => {
    const color = defaultColors[index % defaultColors.length]
    return {
      label: dataset.label,
      data: dataset.data,
      backgroundColor: dataset.backgroundColor || color,
      borderColor: dataset.borderColor || color,
      borderWidth: 0,
      borderRadius: 6,
      barPercentage: 0.7,
      categoryPercentage: 0.8
    }
  })
}))

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: props.horizontal ? 'y' : 'x',
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
      stacked: props.stacked,
      grid: {
        display: props.showGrid && !props.horizontal,
        color: 'rgba(0, 0, 0, 0.05)'
      },
      ticks: {
        font: {
          size: 11
        }
      }
    },
    y: {
      stacked: props.stacked,
      beginAtZero: true,
      grid: {
        display: props.showGrid && props.horizontal,
        color: 'rgba(0, 0, 0, 0.05)'
      },
      ticks: {
        font: {
          size: 11
        }
      }
    }
  }
}))
</script>

<style scoped>
/* Chart container */
div {
  position: relative;
}
</style>
