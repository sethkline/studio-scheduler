<template>
  <div class="max-w-4xl mx-auto px-4 py-6">
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <div v-else-if="!recital" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p class="text-gray-500">No confirmation requests found</p>
    </div>

    <div v-else class="space-y-6">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow p-6">
        <h1 class="text-2xl font-bold">Recital Performance Confirmation</h1>
        <p class="text-gray-600 mt-1">{{ recital.name }}</p>
        <p class="text-sm text-gray-500 mt-1">{{ formatDate(recital.date) }}</p>

        <div class="mt-4 p-4 bg-blue-50 rounded-lg">
          <p class="text-sm text-blue-900">
            <strong>Student:</strong> {{ student?.first_name }} {{ student?.last_name }}
          </p>
          <p class="text-sm text-blue-900 mt-1">
            <strong>Status:</strong>
            <span v-if="allConfirmed" class="text-green-700">✓ All performances confirmed</span>
            <span v-else class="text-yellow-700">{{ pendingCount }} pending confirmation(s)</span>
          </p>
        </div>
      </div>

      <!-- Performances List -->
      <div class="space-y-4">
        <div
          v-for="performance in performances"
          :key="performance.confirmation_id"
          class="bg-white rounded-lg shadow overflow-hidden"
        >
          <div class="p-6">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="text-lg font-semibold">{{ performance.performance_name }}</h3>
                <p v-if="performance.song_title" class="text-gray-600 text-sm mt-1">{{ performance.song_title }}</p>
                <p v-if="performance.class_name" class="text-gray-500 text-sm mt-1">{{ performance.class_name }}</p>

                <div v-if="performance.estimated_time" class="mt-2 text-sm text-gray-600">
                  <strong>Estimated Time:</strong> {{ performance.estimated_time }}
                </div>

                <div v-if="performance.costume_info" class="mt-2 text-sm text-gray-600">
                  <strong>Costume:</strong> {{ performance.costume_info }}
                </div>

                <div v-if="performance.notes" class="mt-2 p-3 bg-gray-50 rounded text-sm">
                  {{ performance.notes }}
                </div>
              </div>

              <!-- Status Badge -->
              <div>
                <span
                  v-if="performance.status === 'confirmed'"
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                >
                  ✓ Confirmed
                </span>
                <span
                  v-else-if="performance.status === 'declined'"
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"
                >
                  Declined
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"
                >
                  Pending
                </span>
              </div>
            </div>

            <!-- Deadline Warning -->
            <div
              v-if="performance.status === 'pending' && performance.confirmation_deadline"
              class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <p class="text-sm text-yellow-800">
                <strong>Deadline:</strong> {{ formatDate(performance.confirmation_deadline) }}
                <span v-if="performance.days_until_deadline !== null">
                  ({{ performance.days_until_deadline > 0 ? performance.days_until_deadline + ' days remaining' : 'Deadline passed!' }})
                </span>
              </p>
            </div>

            <!-- Actions -->
            <div v-if="performance.status === 'pending'" class="mt-4 flex gap-3">
              <AppButton variant="primary" @click="confirmPerformance(performance)">
                Confirm Participation
              </AppButton>
              <AppButton variant="danger" @click="openDeclineModal(performance)">
                Decline
              </AppButton>
            </div>

            <div v-else-if="performance.status === 'confirmed'" class="mt-4">
              <p class="text-sm text-green-700">
                Confirmed on {{ formatDate(performance.confirmation_date!) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Decline Modal -->
    <AppModal v-model="showDeclineModal" title="Decline Performance" @close="showDeclineModal = false">
      <form @submit.prevent="submitDecline" class="space-y-4">
        <p class="text-sm text-gray-600">
          Please let us know why {{ student?.first_name }} won't be able to perform.
        </p>

        <div>
          <label class="block text-sm font-medium mb-1">Reason Category</label>
          <select
            v-model="declineForm.opt_out_category"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          >
            <option value="">Select a reason...</option>
            <option value="schedule_conflict">Schedule Conflict</option>
            <option value="cost">Cost Concerns</option>
            <option value="injury">Injury or Health</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Please explain (required)</label>
          <textarea
            v-model="declineForm.decline_reason"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            rows="4"
            required
            placeholder="Please provide details..."
          ></textarea>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <AppButton variant="secondary" @click="showDeclineModal = false">Cancel</AppButton>
          <AppButton variant="danger" native-type="submit" :loading="submitting">
            Submit Decline
          </AppButton>
        </div>
      </form>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = defineProps<{ studentId: string }>()

const loading = ref(false)
const submitting = ref(false)
const showDeclineModal = ref(false)
const selectedPerformance = ref<any>(null)

const student = ref<any>(null)
const recital = ref<any>(null)
const performances = ref<any[]>([])
const pendingCount = ref(0)
const allConfirmed = ref(false)

const declineForm = ref({
  opt_out_category: '',
  decline_reason: '',
})

async function fetchConfirmations() {
  loading.value = true
  try {
    const { data } = await useFetch(`/api/parent/students/${props.studentId}/recital-confirmations`)
    if (data.value) {
      student.value = (data.value as any).student
      recital.value = (data.value as any).recital
      performances.value = (data.value as any).performances || []
      pendingCount.value = (data.value as any).pending_count || 0
      allConfirmed.value = (data.value as any).all_confirmed || false
    }
  } catch (error) {
    console.error('Failed to fetch confirmations:', error)
  } finally {
    loading.value = false
  }
}

async function confirmPerformance(performance: any) {
  try {
    await $fetch(`/api/parent/confirmations/${performance.confirmation_id}/confirm`, {
      method: 'POST',
      body: {},
    })
    await fetchConfirmations()
  } catch (error) {
    console.error('Failed to confirm performance:', error)
  }
}

function openDeclineModal(performance: any) {
  selectedPerformance.value = performance
  showDeclineModal.value = true
}

async function submitDecline() {
  if (!selectedPerformance.value) return

  submitting.value = true
  try {
    await $fetch(`/api/parent/confirmations/${selectedPerformance.value.confirmation_id}/decline`, {
      method: 'POST',
      body: declineForm.value,
    })
    showDeclineModal.value = false
    declineForm.value = { opt_out_category: '', decline_reason: '' }
    await fetchConfirmations()
  } catch (error) {
    console.error('Failed to decline performance:', error)
  } finally {
    submitting.value = false
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString()
}

onMounted(() => {
  fetchConfirmations()
})
</script>
