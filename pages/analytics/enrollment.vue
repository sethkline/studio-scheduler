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
        <h1 class="text-3xl font-bold text-gray-900 mt-2">Enrollment Trends</h1>
        <p class="text-gray-600">Monitor enrollment patterns, capacity utilization, and growth forecasts</p>
      </div>
      <ExportButton
        report-type="enrollment"
        :report-data="enrollmentData"
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

    <!-- Loading/Error States -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p class="text-gray-600">Loading enrollment data...</p>
      </div>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
      <div class="flex items-center">
        <i class="pi pi-exclamation-triangle text-red-600 text-2xl mr-3"></i>
        <div>
          <h3 class="text-red-800 font-semibold">Error Loading Data</h3>
          <p class="text-red-600 text-sm">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KpiCard
          title="Total New Enrollments"
          :value="enrollmentData?.summary?.totalNewEnrollments || 0"
          format="number"
          icon="pi pi-plus-circle"
        />
        <KpiCard
          title="Active Students"
          :value="enrollmentData?.summary?.currentActive || 0"
          format="number"
          icon="pi pi-users"
        />
        <KpiCard
          title="Net Growth"
          :value="enrollmentData?.summary?.netGrowth || 0"
          format="number"
          icon="pi pi-chart-line"
          :change="enrollmentData?.summary?.netGrowth || 0"
          :changeType="(enrollmentData?.summary?.netGrowth || 0) > 0 ? 'positive' : 'negative'"
        />
        <KpiCard
          title="Withdrawals"
          :value="enrollmentData?.summary?.totalWithdrawals || 0"
          format="number"
          icon="pi pi-minus-circle"
        />
      </div>

      <!-- Enrollment Trends Chart -->
      <div class="bg-white rounded-lg shadow p-6 mb-8">
        <h2 class="text-xl font-bold text-gray-900 mb-6">Monthly Enrollment Trends</h2>
        <LineChart
          :labels="trendLabels"
          :datasets="trendDatasets"
          :height="350"
        />
      </div>

      <!-- Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Enrollment by Dance Style -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">Enrollment by Dance Style</h2>
          <PieChart
            :labels="styleLabels"
            :data="styleData"
          />
        </div>

        <!-- Enrollment by Age Group -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">Enrollment by Age Group</h2>
          <BarChart
            :labels="ageLabels"
            :datasets="ageDatasets"
            :height="300"
          />
        </div>
      </div>

      <!-- Class Capacity Utilization -->
      <div class="bg-white rounded-lg shadow p-6 mb-8">
        <h2 class="text-xl font-bold text-gray-900 mb-6">Class Capacity Utilization</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Style</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Enrolled</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Max</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Utilization</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="cls in enrollmentData?.classCapacity?.slice(0, 10)" :key="cls.classId">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ cls.className }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ cls.danceStyle }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{{ cls.enrolled }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">{{ cls.maxStudents }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span
                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                    :class="{
                      'bg-green-100 text-green-800': cls.utilizationPercent >= 80,
                      'bg-yellow-100 text-yellow-800': cls.utilizationPercent >= 50 && cls.utilizationPercent < 80,
                      'bg-red-100 text-red-800': cls.utilizationPercent < 50
                    }"
                  >
                    {{ cls.utilizationPercent.toFixed(1) }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Enrollment Forecast -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-6">Enrollment Forecast</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="text-center p-4 bg-blue-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-2">Current Active</p>
            <p class="text-2xl font-bold text-blue-600">{{ enrollmentData?.forecast?.currentActive || 0 }}</p>
          </div>
          <div class="text-center p-4 bg-blue-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-2">Next Month</p>
            <p class="text-2xl font-bold text-blue-600">{{ enrollmentData?.forecast?.projectedNextMonth || 0 }}</p>
          </div>
          <div class="text-center p-4 bg-blue-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-2">3 Months</p>
            <p class="text-2xl font-bold text-blue-600">{{ enrollmentData?.forecast?.projectedThreeMonths || 0 }}</p>
          </div>
          <div class="text-center p-4 bg-blue-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-2">6 Months</p>
            <p class="text-2xl font-bold text-blue-600">{{ enrollmentData?.forecast?.projectedSixMonths || 0 }}</p>
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

definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'default'
})

const { fetchEnrollmentAnalytics, getDefaultDateRange } = useAnalyticsService()

const loading = ref(true)
const error = ref<string | null>(null)
const enrollmentData = ref<any>(null)
const dateRange = ref(getDefaultDateRange())

const trendLabels = computed(() => enrollmentData.value?.trends?.monthly?.map((t: any) => t.month) || [])
const trendDatasets = computed(() => [
  { label: 'New Enrollments', data: enrollmentData.value?.trends?.monthly?.map((t: any) => t.newEnrollments) || [] },
  { label: 'Unique Students', data: enrollmentData.value?.trends?.monthly?.map((t: any) => t.uniqueStudents) || [] }
])

const styleLabels = computed(() => enrollmentData.value?.enrollmentsByDanceStyle?.map((s: any) => s.style) || [])
const styleData = computed(() => enrollmentData.value?.enrollmentsByDanceStyle?.map((s: any) => s.count) || [])

const ageLabels = computed(() => enrollmentData.value?.enrollmentsByAgeGroup?.map((a: any) => a.ageGroup) || [])
const ageDatasets = computed(() => [
  { label: 'Students', data: enrollmentData.value?.enrollmentsByAgeGroup?.map((a: any) => a.count) || [] }
])

async function loadEnrollmentData() {
  loading.value = true
  error.value = null
  try {
    const { data, error: fetchError } = await fetchEnrollmentAnalytics(dateRange.value)
    if (fetchError.value) throw new Error(fetchError.value.message)
    enrollmentData.value = data.value
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function handleDateRangeChange(newRange: any) {
  dateRange.value = newRange
  loadEnrollmentData()
}

function handleExport(format: string) {
  console.log(`Exporting to ${format}...`)
}

onMounted(() => {
  loadEnrollmentData()
})
</script>
