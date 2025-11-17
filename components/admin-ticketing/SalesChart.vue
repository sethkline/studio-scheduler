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
  type ChartOptions
} from 'chart.js'
import type { ShowSalesStats } from '~/types'

// Register Chart.js components
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

interface Props {
  showStats: ShowSalesStats[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Prepare chart data
const chartData = computed(() => {
  const labels = props.showStats.map(show => {
    const date = new Date(show.show_date)
    return `${show.show_title}\n${date.toLocaleDateString()}`
  })

  const ticketsSold = props.showStats.map(show => show.total_tickets_sold)
  const totalSeats = props.showStats.map(show => show.total_seats)

  return {
    labels,
    datasets: [
      {
        label: 'Tickets Sold',
        data: ticketsSold,
        backgroundColor: 'rgba(59, 130, 246, 0.7)', // Blue
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      },
      {
        label: 'Total Capacity',
        data: totalSeats,
        backgroundColor: 'rgba(209, 213, 219, 0.5)', // Gray
        borderColor: 'rgb(209, 213, 219)',
        borderWidth: 1
      }
    ]
  }
})

// Chart options
const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top'
    },
    tooltip: {
      callbacks: {
        afterLabel: (context) => {
          const index = context.dataIndex
          const show = props.showStats[index]
          if (!show) return ''
          return `${show.sold_percentage}% sold`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0
      }
    }
  }
}
</script>

<template>
  <Card class="h-full">
    <template #title>
      <h3 class="text-xl font-bold text-gray-900">Ticket Sales by Show</h3>
    </template>
    <template #content>
      <div v-if="loading" class="flex justify-center items-center h-64">
        <ProgressSpinner />
      </div>
      <div v-else-if="showStats.length === 0" class="flex justify-center items-center h-64 text-gray-500">
        <div class="text-center">
          <i class="pi pi-chart-bar text-4xl mb-2"></i>
          <p>No show data available</p>
        </div>
      </div>
      <div v-else class="h-80">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </template>
  </Card>
</template>
