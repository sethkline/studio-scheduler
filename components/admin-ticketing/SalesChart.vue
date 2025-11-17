<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  type ChartData,
  type ChartOptions
} from 'chart.js'

// Register Chart.js components
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

/**
 * SalesChart Component
 * Displays tickets sold and revenue by show in a bar chart
 */

interface ShowStats {
  show_id: string
  show_title: string
  show_date: string
  tickets_sold: number
  total_revenue_cents: number
}

interface Props {
  showStats: ShowStats[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

/**
 * Prepare chart data
 */
const chartData = computed<ChartData<'bar'>>(() => {
  const labels = props.showStats.map((show) => {
    const date = new Date(show.show_date)
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
    return `${show.show_title}\n${formattedDate}`
  })

  return {
    labels,
    datasets: [
      {
        label: 'Tickets Sold',
        data: props.showStats.map((show) => show.tickets_sold),
        backgroundColor: 'rgba(59, 130, 246, 0.8)', // blue-500
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        yAxisID: 'y'
      },
      {
        label: 'Revenue ($)',
        data: props.showStats.map((show) => show.total_revenue_cents / 100),
        backgroundColor: 'rgba(16, 185, 129, 0.8)', // green-500
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
        yAxisID: 'y1'
      }
    ]
  }
})

/**
 * Chart options
 */
const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  scales: {
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      title: {
        display: true,
        text: 'Tickets Sold'
      },
      beginAtZero: true,
      ticks: {
        stepSize: 1
      }
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      title: {
        display: true,
        text: 'Revenue ($)'
      },
      beginAtZero: true,
      grid: {
        drawOnChartArea: false
      },
      ticks: {
        callback: function (value) {
          return '$' + value.toLocaleString()
        }
      }
    }
  },
  plugins: {
    legend: {
      display: true,
      position: 'top'
    },
    tooltip: {
      callbacks: {
        label: function (context) {
          let label = context.dataset.label || ''

          if (label) {
            label += ': '
          }

          if (context.parsed.y !== null) {
            if (context.datasetIndex === 1) {
              // Revenue dataset
              label += '$' + context.parsed.y.toFixed(2)
            } else {
              // Tickets sold dataset
              label += context.parsed.y
            }
          }

          return label
        }
      }
    }
  }
}))
</script>

<template>
  <Card class="border border-gray-200">
    <template #header>
      <div class="p-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Sales by Show</h3>
        <p class="text-sm text-gray-600 mt-1">Tickets sold and revenue per show</p>
      </div>
    </template>

    <template #content>
      <div v-if="loading" class="space-y-2 p-4">
        <Skeleton height="300px" />
      </div>

      <div v-else-if="showStats.length === 0" class="text-center py-12">
        <i class="pi pi-chart-bar text-4xl text-gray-400 mb-4" />
        <p class="text-gray-600">No sales data available for the selected period</p>
      </div>

      <div v-else class="p-4" style="height: 400px">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </template>
  </Card>
</template>
