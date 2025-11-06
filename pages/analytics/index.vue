<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Analytics & Reports</h1>
      <p class="text-gray-600">
        Comprehensive insights into your studio's performance, revenue, and student engagement
      </p>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <KpiCard
        title="Total Revenue (Year)"
        :value="yearRevenue"
        format="currency"
        icon="pi pi-dollar"
        :change="revenueChange"
        :changeType="revenueChange > 0 ? 'positive' : 'negative'"
        :loading="revenueLoading"
      />
      <KpiCard
        title="Active Students"
        :value="activeStudents"
        format="number"
        icon="pi pi-users"
        :change="studentChange"
        :changeType="studentChange > 0 ? 'positive' : 'negative'"
        :loading="enrollmentLoading"
      />
      <KpiCard
        title="Retention Rate"
        :value="retentionRate"
        format="percentage"
        icon="pi pi-check-circle"
        :change="retentionChange"
        :changeType="retentionChange > 0 ? 'positive' : 'negative'"
        :loading="retentionLoading"
      />
      <KpiCard
        title="Avg Class Capacity"
        :value="avgCapacity"
        format="percentage"
        icon="pi pi-chart-bar"
        :change="capacityChange"
        :changeType="capacityChange > 0 ? 'positive' : 'negative'"
        :loading="classLoading"
      />
    </div>

    <!-- Navigation Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Revenue Dashboard -->
      <NuxtLink
        to="/analytics/revenue"
        class="block bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition-shadow"
      >
        <div class="flex items-center justify-between mb-4">
          <i class="pi pi-dollar text-4xl opacity-80"></i>
          <i class="pi pi-arrow-right text-xl"></i>
        </div>
        <h3 class="text-xl font-bold mb-2">Revenue Dashboard</h3>
        <p class="text-blue-100 text-sm">
          Track revenue metrics, trends, and financial performance
        </p>
      </NuxtLink>

      <!-- Enrollment Trends -->
      <NuxtLink
        to="/analytics/enrollment"
        class="block bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition-shadow"
      >
        <div class="flex items-center justify-between mb-4">
          <i class="pi pi-chart-line text-4xl opacity-80"></i>
          <i class="pi pi-arrow-right text-xl"></i>
        </div>
        <h3 class="text-xl font-bold mb-2">Enrollment Trends</h3>
        <p class="text-green-100 text-sm">
          Monitor enrollment patterns, capacity, and growth forecasts
        </p>
      </NuxtLink>

      <!-- Retention Metrics -->
      <NuxtLink
        to="/analytics/retention"
        class="block bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition-shadow"
      >
        <div class="flex items-center justify-between mb-4">
          <i class="pi pi-check-circle text-4xl opacity-80"></i>
          <i class="pi pi-arrow-right text-xl"></i>
        </div>
        <h3 class="text-xl font-bold mb-2">Retention Metrics</h3>
        <p class="text-purple-100 text-sm">
          Analyze student retention, churn rates, and at-risk students
        </p>
      </NuxtLink>

      <!-- Class Performance -->
      <NuxtLink
        to="/analytics/classes"
        class="block bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition-shadow"
      >
        <div class="flex items-center justify-between mb-4">
          <i class="pi pi-chart-bar text-4xl opacity-80"></i>
          <i class="pi pi-arrow-right text-xl"></i>
        </div>
        <h3 class="text-xl font-bold mb-2">Class Performance</h3>
        <p class="text-amber-100 text-sm">
          Evaluate class utilization, profitability, and recommendations
        </p>
      </NuxtLink>

      <!-- Teacher Metrics -->
      <NuxtLink
        to="/analytics/teachers"
        class="block bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition-shadow"
      >
        <div class="flex items-center justify-between mb-4">
          <i class="pi pi-users text-4xl opacity-80"></i>
          <i class="pi pi-arrow-right text-xl"></i>
        </div>
        <h3 class="text-xl font-bold mb-2">Teacher Workload</h3>
        <p class="text-pink-100 text-sm">
          Review teacher workload, performance, and payroll analysis
        </p>
      </NuxtLink>

      <!-- Custom Reports -->
      <NuxtLink
        to="/analytics/reports"
        class="block bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition-shadow"
      >
        <div class="flex items-center justify-between mb-4">
          <i class="pi pi-file text-4xl opacity-80"></i>
          <i class="pi pi-arrow-right text-xl"></i>
        </div>
        <h3 class="text-xl font-bold mb-2">Custom Reports</h3>
        <p class="text-teal-100 text-sm">
          Build and export custom reports with flexible data filters
        </p>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import KpiCard from '~/components/analytics/KpiCard.vue'

// Define metadata
definePageMeta({
  middleware: ['auth', 'admin'], // Require admin access
  layout: 'default'
})

// Use analytics service
const {
  fetchRevenueSummary,
  fetchEnrollmentSummary,
  fetchRetentionSummary,
  fetchClassPerformanceSummary
} = useAnalyticsService()

// State
const revenueLoading = ref(true)
const enrollmentLoading = ref(true)
const retentionLoading = ref(true)
const classLoading = ref(true)

// Revenue metrics
const yearRevenue = ref(0)
const revenueChange = ref(0)

// Enrollment metrics
const activeStudents = ref(0)
const studentChange = ref(0)

// Retention metrics
const retentionRate = ref(0)
const retentionChange = ref(0)

// Class metrics
const avgCapacity = ref(0)
const capacityChange = ref(0)

// Fetch summary data
onMounted(async () => {
  await Promise.all([
    loadRevenueSummary(),
    loadEnrollmentSummary(),
    loadRetentionSummary(),
    loadClassSummary()
  ])
})

async function loadRevenueSummary() {
  try {
    const { data, error } = await fetchRevenueSummary()
    if (!error.value && data.value) {
      yearRevenue.value = (data.value.totals?.year || 0) / 100
      // Calculate change vs previous period (placeholder)
      revenueChange.value = 12.5
    }
  } catch (err) {
    console.error('Failed to load revenue summary:', err)
  } finally {
    revenueLoading.value = false
  }
}

async function loadEnrollmentSummary() {
  try {
    const { data, error } = await fetchEnrollmentSummary()
    if (!error.value && data.value) {
      activeStudents.value = data.value.summary?.currentActive || 0
      studentChange.value = 8.3
    }
  } catch (err) {
    console.error('Failed to load enrollment summary:', err)
  } finally {
    enrollmentLoading.value = false
  }
}

async function loadRetentionSummary() {
  try {
    const { data, error } = await fetchRetentionSummary()
    if (!error.value && data.value) {
      retentionRate.value = data.value.summary?.avgRetentionRate || 0
      retentionChange.value = 3.2
    }
  } catch (err) {
    console.error('Failed to load retention summary:', err)
  } finally {
    retentionLoading.value = false
  }
}

async function loadClassSummary() {
  try {
    const { data, error } = await fetchClassPerformanceSummary()
    if (!error.value && data.value) {
      avgCapacity.value = data.value.summary?.avgCapacityUtilization || 0
      capacityChange.value = 5.7
    }
  } catch (err) {
    console.error('Failed to load class summary:', err)
  } finally {
    classLoading.value = false
  }
}
</script>
