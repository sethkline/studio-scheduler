<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Performer Confirmations</h1>
        <p class="text-sm text-gray-600 mt-1">Manage recital performer confirmations and track responses</p>
      </div>
      <div class="flex gap-3">
        <AppButton variant="secondary" @click="showPopulateModal = true" v-if="can('canManageRecitals')">
          <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Populate Performers
        </AppButton>
        <AppButton variant="primary" @click="showSendRequestsModal = true" v-if="can('canManageRecitals')">
          <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Send Requests
        </AppButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AppCard>
          <div class="text-center">
            <p class="text-sm text-gray-500">Total Performers</p>
            <p class="text-3xl font-bold mt-1">{{ overview.summary.total_performers }}</p>
          </div>
        </AppCard>
        <AppCard>
          <div class="text-center">
            <p class="text-sm text-gray-500">Confirmed</p>
            <p class="text-3xl font-bold mt-1 text-green-600">{{ overview.summary.confirmed }}</p>
          </div>
        </AppCard>
        <AppCard>
          <div class="text-center">
            <p class="text-sm text-gray-500">Pending</p>
            <p class="text-3xl font-bold mt-1 text-yellow-600">{{ overview.summary.pending }}</p>
          </div>
        </AppCard>
        <AppCard>
          <div class="text-center">
            <p class="text-sm text-gray-500">Confirmation Rate</p>
            <p class="text-3xl font-bold mt-1 text-blue-600">{{ overview.summary.confirmation_rate.toFixed(1) }}%</p>
          </div>
        </AppCard>
      </div>

      <!-- Deadline Alert -->
      <div v-if="overview.summary.deadline" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex items-center gap-3">
          <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <p class="font-medium text-blue-900">Confirmation Deadline</p>
            <p class="text-sm text-blue-700">
              {{ formatDate(overview.summary.deadline) }}
              <span v-if="overview.summary.days_until_deadline !== undefined">
                ({{ overview.summary.days_until_deadline > 0 ? overview.summary.days_until_deadline + ' days remaining' : 'Deadline passed' }})
              </span>
            </p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex gap-6">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            @click="activeTab = tab.value"
            :class="[
              'pb-3 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab.value
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Pending Confirmations -->
      <AppCard v-if="activeTab === 'pending'">
        <h3 class="text-lg font-semibold mb-4">Pending Confirmations</h3>

        <div v-if="overview.pending_confirmations.length === 0" class="text-center py-8 text-gray-500">
          All performers have been confirmed!
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="pending in overview.pending_confirmations"
            :key="pending.student_id"
            class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h4 class="font-medium">{{ pending.student_name }}</h4>
                <p class="text-sm text-gray-600 mt-1">{{ pending.guardian_name }} - {{ pending.guardian_email }}</p>
                <div class="mt-2">
                  <p class="text-sm font-medium text-gray-700">Performances:</p>
                  <ul class="list-disc list-inside text-sm text-gray-600">
                    <li v-for="(perf, idx) in pending.performances" :key="idx">{{ perf }}</li>
                  </ul>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-500">{{ pending.reminders_sent }} reminder(s) sent</p>
                <p v-if="pending.last_reminder" class="text-xs text-gray-400 mt-1">
                  Last: {{ formatDate(pending.last_reminder) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppCard>

      <!-- By Class -->
      <AppCard v-if="activeTab === 'by_class'">
        <h3 class="text-lg font-semibold mb-4">Confirmations by Class</h3>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confirmed</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Declined</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="classData in overview.by_class" :key="classData.class_name">
                <td class="px-4 py-3 text-sm font-medium">{{ classData.class_name }}</td>
                <td class="px-4 py-3 text-sm">{{ classData.total }}</td>
                <td class="px-4 py-3 text-sm text-green-600">{{ classData.confirmed }}</td>
                <td class="px-4 py-3 text-sm text-yellow-600">{{ classData.pending }}</td>
                <td class="px-4 py-3 text-sm text-red-600">{{ classData.declined }}</td>
                <td class="px-4 py-3 text-sm">{{ ((classData.confirmed / classData.total) * 100).toFixed(0) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <!-- By Performance -->
      <AppCard v-if="activeTab === 'by_performance'">
        <h3 class="text-lg font-semibold mb-4">Confirmations by Performance</h3>

        <div class="space-y-3">
          <div
            v-for="perf in overview.by_performance"
            :key="perf.performance_id"
            class="border border-gray-200 rounded-lg p-4"
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium">{{ perf.performance_name }}</h4>
              </div>
              <div class="text-right">
                <span class="text-sm text-green-600 font-medium">{{ perf.confirmed_count }} confirmed</span>
                <span v-if="perf.pending_count > 0" class="text-sm text-yellow-600 ml-3">{{ perf.pending_count }} pending</span>
              </div>
            </div>
          </div>
        </div>
      </AppCard>
    </div>

    <!-- Modals -->
    <PopulatePerformersModal
      v-model="showPopulateModal"
      :recital-id="recitalId"
      @populated="fetchOverview"
    />

    <SendConfirmationRequestsModal
      v-model="showSendRequestsModal"
      :recital-id="recitalId"
      @sent="fetchOverview"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePermissions } from '~/composables/usePermissions'
import type { PerformerConfirmationOverview } from '~/types/tier1-features'

const props = defineProps<{ recitalId: string }>()

const { can } = usePermissions()

const loading = ref(false)
const activeTab = ref<'pending' | 'by_class' | 'by_performance'>('pending')
const showPopulateModal = ref(false)
const showSendRequestsModal = ref(false)

const overview = ref<PerformerConfirmationOverview>({
  summary: {
    total_performers: 0,
    confirmed: 0,
    declined: 0,
    pending: 0,
    confirmation_rate: 0,
  },
  by_class: [],
  by_performance: [],
  pending_confirmations: [],
})

const tabs = [
  { label: 'Pending', value: 'pending' },
  { label: 'By Class', value: 'by_class' },
  { label: 'By Performance', value: 'by_performance' },
]

async function fetchOverview() {
  loading.value = true
  try {
    const { data } = await useFetch(`/api/recitals/${props.recitalId}/confirmation-status`)
    if (data.value) {
      overview.value = data.value as any
    }
  } catch (error) {
    console.error('Failed to fetch confirmation overview:', error)
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString()
}

onMounted(() => {
  fetchOverview()
})
</script>
