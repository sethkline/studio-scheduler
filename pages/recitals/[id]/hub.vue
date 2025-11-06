<template>
  <div class="recital-hub">
    <!-- Page Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">
            {{ recital?.name || 'Loading...' }}
          </h1>
          <p class="text-gray-600 mt-1">Recital Command Center</p>
        </div>
        <div class="flex gap-3">
          <Button
            label="View Program"
            icon="pi pi-book"
            severity="secondary"
            outlined
            @click="navigateTo(`/recitals/${recitalId}/program`)"
          />
          <Button
            label="Public Page"
            icon="pi pi-external-link"
            severity="secondary"
            outlined
            @click="navigateTo(`/public/recitals/${recital?.public_slug}`)"
            v-if="recital?.is_public && recital?.public_slug"
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <i class="pi pi-exclamation-triangle text-4xl text-red-500 mb-3"></i>
      <p class="text-red-700">{{ error }}</p>
      <Button label="Retry" icon="pi pi-refresh" @click="loadDashboard" class="mt-4" />
    </div>

    <!-- Dashboard Content -->
    <div v-else class="space-y-6">
      <!-- Countdown and Overall Progress -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecitalCountdown :countdown="metrics?.countdown" :recital-date="recital?.date" />
        <RecitalOverallProgress
          :completion="metrics?.metrics?.overallCompletion"
          :at-risk-items="metrics?.atRiskItems"
        />
        <RecitalQuickLinks :recital-id="recitalId" />
      </div>

      <!-- Key Metrics Cards -->
      <RecitalMetricsCards :metrics="metrics?.metrics" :progress="metrics?.progress" />

      <!-- Progress Bars for Major Milestones -->
      <RecitalProgressBars :progress="metrics?.progress" />

      <!-- Two Column Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent Activity Feed -->
        <RecitalActivityFeed :recital-id="recitalId" />

        <!-- Assigned Staff -->
        <RecitalAssignedStaff :staff="metrics?.assignedStaff" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'staff']
})

const route = useRoute()
const recitalId = route.params.id as string

const loading = ref(true)
const error = ref<string | null>(null)
const metrics = ref<any>(null)
const recital = ref<any>(null)

// Load dashboard data
const loadDashboard = async () => {
  loading.value = true
  error.value = null

  try {
    const { data, error: fetchError } = await useFetch(`/api/recitals/${recitalId}/dashboard-metrics`)

    if (fetchError.value) {
      throw new Error(fetchError.value.message)
    }

    metrics.value = data.value
    recital.value = data.value?.recital
  } catch (err: any) {
    error.value = err.message || 'Failed to load dashboard'
    console.error('Dashboard error:', err)
  } finally {
    loading.value = false
  }
}

// Auto-refresh every 60 seconds
const refreshInterval = setInterval(loadDashboard, 60000)

onMounted(() => {
  loadDashboard()
})

onUnmounted(() => {
  clearInterval(refreshInterval)
})
</script>

<style scoped>
.recital-hub {
  @apply p-6 max-w-7xl mx-auto;
}
</style>
