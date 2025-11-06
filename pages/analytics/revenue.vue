<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <NuxtLink
          to="/analytics"
          class="text-primary-600 hover:text-primary-700 mb-2 inline-flex items-center text-sm"
        >
          <i class="pi pi-arrow-left mr-2"></i>
          Back to Analytics
        </NuxtLink>
        <h1 class="text-3xl font-bold text-gray-900 mt-2">Revenue Dashboard</h1>
        <p class="text-gray-600">Monitor revenue metrics, trends, and financial performance</p>
      </div>
      <ExportButton
        report-type="revenue"
        :report-data="exportData"
        @export="handleExport"
      />
    </div>

    <!-- Date Range Filter -->
    <div class="mb-8 bg-white rounded-lg shadow p-6">
      <DateRangePicker
        v-model="dateRange"
        @change="handleDateRangeChange"
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p class="text-gray-600">Loading revenue data...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
      <div class="flex items-center">
        <i class="pi pi-exclamation-triangle text-red-600 text-2xl mr-3"></i>
        <div>
          <h3 class="text-red-800 font-semibold">Error Loading Data</h3>
          <p class="text-red-600 text-sm">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Revenue Content -->
    <div v-else>
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard
          title="Total Revenue"
          :value="revenueData?.totals?.netRevenue / 100 || 0"
          format="currency"
          icon="pi pi-dollar"
          :change="yearAgoChange"
          :changeType="yearAgoChange > 0 ? 'positive' : 'negative'"
          changeLabel="vs last year"
        />
        <KpiCard
          title="Month Revenue"
          :value="revenueData?.totals?.month / 100 || 0"
          format="currency"
          icon="pi pi-calendar"
        />
        <KpiCard
          title="Quarter Revenue"
          :value="revenueData?.totals?.quarter / 100 || 0"
          format="currency"
          icon="pi pi-chart-line"
        />
        <KpiCard
          title="Outstanding"
          :value="revenueData?.outstanding?.total / 100 || 0"
          format="currency"
          icon="pi pi-clock"
          :subtext="`${revenueData?.outstanding?.invoiceCount || 0} unpaid invoices`"
        />
      </div>

      <!-- Revenue Trends Chart -->
      <div class="bg-white rounded-lg shadow p-6 mb-8">
        <h2 class="text-xl font-bold text-gray-900 mb-6">Revenue Trends Over Time</h2>
        <LineChart
          :labels="trendLabels"
          :datasets="trendDatasets"
          :height="350"
          :fill="true"
        />
      </div>

      <!-- Revenue by Source -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">Revenue by Source</h2>
          <PieChart
            :labels="sourceLabels"
            :data="sourceData"
            :max-width="300"
          />
        </div>

        <!-- Refund Impact -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">Refund Impact</h2>
          <div class="space-y-4">
            <div class="flex justify-between items-center py-3 border-b">
              <span class="text-gray-600">Total Refunds</span>
              <span class="text-xl font-bold text-red-600">
                {{ formatCurrency(revenueData?.totals?.refunds || 0) }}
              </span>
            </div>
            <div v-for="(amount, method) in revenueData?.refunds?.byMethod" :key="method" class="flex justify-between items-center">
              <span class="text-gray-600 capitalize">{{ method }}</span>
              <span class="font-semibold">{{ formatCurrency(amount) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Revenue-Generating Classes -->
      <div class="bg-white rounded-lg shadow p-6 mb-8">
        <h2 class="text-xl font-bold text-gray-900 mb-6">Top Revenue-Generating Classes</h2>
        <BarChart
          :labels="topClassLabels"
          :datasets="topClassDatasets"
          :height="400"
          :horizontal="true"
        />
      </div>

      <!-- Teacher Revenue Contribution -->
      <div class="bg-white rounded-lg shadow p-6 mb-8">
        <h2 class="text-xl font-bold text-gray-900 mb-6">Teacher Revenue Contribution</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teacher
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Classes
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg per Class
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="teacher in revenueData?.teacherContributions" :key="teacher.name">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{ teacher.name }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-semibold">
                  {{ formatCurrency(teacher.revenue) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                  {{ teacher.classes }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                  {{ formatCurrency(teacher.classes > 0 ? teacher.revenue / teacher.classes : 0) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Year-over-Year Comparison -->
      <div v-if="revenueData?.yearAgoComparison" class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-6">Year-over-Year Comparison</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-2">Current Period</p>
            <p class="text-2xl font-bold text-gray-900">
              {{ formatCurrency(revenueData.yearAgoComparison.currentPeriod) }}
            </p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-2">Previous Period</p>
            <p class="text-2xl font-bold text-gray-900">
              {{ formatCurrency(revenueData.yearAgoComparison.previousPeriod) }}
            </p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-2">Change</p>
            <p
              class="text-2xl font-bold"
              :class="{
                'text-green-600': revenueData.yearAgoComparison.percentChange > 0,
                'text-red-600': revenueData.yearAgoComparison.percentChange < 0
              }"
            >
              <i
                :class="{
                  'pi pi-arrow-up': revenueData.yearAgoComparison.percentChange > 0,
                  'pi pi-arrow-down': revenueData.yearAgoComparison.percentChange < 0
                }"
                class="text-lg mr-2"
              ></i>
              {{ Math.abs(revenueData.yearAgoComparison.percentChange).toFixed(1) }}%
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import KpiCard from '~/components/analytics/KpiCard.vue'
import LineChart from '~/components/analytics/LineChart.vue'
import BarChart from '~/components/analytics/BarChart.vue'
import PieChart from '~/components/analytics/PieChart.vue'
import DateRangePicker from '~/components/analytics/DateRangePicker.vue'
import ExportButton from '~/components/analytics/ExportButton.vue'

// Define metadata
definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'default'
})

// Use analytics service
const { fetchRevenueAnalytics, formatCurrency, getDefaultDateRange } = useAnalyticsService()

// State
const loading = ref(true)
const error = ref<string | null>(null)
const revenueData = ref<any>(null)
const dateRange = ref(getDefaultDateRange())

// Computed properties for charts
const trendLabels = computed(() => {
  return revenueData.value?.trends?.map((t: any) => t.period) || []
})

const trendDatasets = computed(() => [
  {
    label: 'Net Revenue',
    data: revenueData.value?.trends?.map((t: any) => t.netRevenue / 100) || []
  }
])

const sourceLabels = computed(() => ['Ticket Sales', 'Tuition', 'Other'])

const sourceData = computed(() => [
  revenueData.value?.revenueBySource?.tickets / 100 || 0,
  revenueData.value?.revenueBySource?.tuition / 100 || 0,
  revenueData.value?.revenueBySource?.other / 100 || 0
])

const topClassLabels = computed(() => {
  return revenueData.value?.topClasses?.map((c: any) => c.className) || []
})

const topClassDatasets = computed(() => [
  {
    label: 'Revenue',
    data: revenueData.value?.topClasses?.map((c: any) => c.revenue / 100) || []
  }
])

const yearAgoChange = computed(() => {
  return revenueData.value?.yearAgoComparison?.percentChange || 0
})

const exportData = computed(() => {
  return revenueData.value
})

// Methods
async function loadRevenueData() {
  loading.value = true
  error.value = null

  try {
    const { data, error: fetchError } = await fetchRevenueAnalytics({
      ...dateRange.value,
      compareYearAgo: true
    })

    if (fetchError.value) {
      throw new Error(fetchError.value.message || 'Failed to load revenue data')
    }

    revenueData.value = data.value
  } catch (err: any) {
    console.error('Revenue data error:', err)
    error.value = err.message || 'An unexpected error occurred'
  } finally {
    loading.value = false
  }
}

function handleDateRangeChange(newRange: any) {
  dateRange.value = newRange
  loadRevenueData()
}

function handleExport(format: string) {
  console.log(`Exporting to ${format}...`)
  // Export logic will be handled by ExportButton component
}

// Load data on mount
onMounted(() => {
  loadRevenueData()
})
</script>
