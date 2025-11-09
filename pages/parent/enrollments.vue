<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Manage Enrollments</h1>
      <p class="text-gray-600">View and manage enrollment requests and active enrollments</p>
    </div>

    <!-- Tabs -->
    <TabView>
      <!-- Enrollment Requests Tab -->
      <TabPanel header="Enrollment Requests">
        <div class="space-y-4">
          <!-- Loading State -->
          <div v-if="loadingRequests" class="flex justify-center py-8">
            <ProgressSpinner />
          </div>

          <!-- No Requests -->
          <div v-else-if="!enrollmentRequests.length" class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <i class="pi pi-inbox text-gray-400 text-4xl mb-4"></i>
            <h3 class="text-lg font-semibold text-gray-700 mb-2">No Enrollment Requests</h3>
            <p class="text-gray-600 mb-4">You haven't submitted any enrollment requests yet</p>
            <Button label="Browse Classes" icon="pi pi-search" @click="$router.push('/parent/classes')" />
          </div>

          <!-- Requests List -->
          <div v-else class="space-y-4">
            <Card
              v-for="request in enrollmentRequests"
              :key="request.id"
              class="shadow-sm"
            >
              <template #header>
                <div class="flex justify-between items-start p-4 bg-gray-50 border-b border-gray-200">
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">{{ request.class.name }}</h3>
                    <p class="text-sm text-gray-600">{{ request.student.fullName }}</p>
                  </div>
                  <Tag
                    :value="formatStatus(request.status)"
                    :severity="getStatusSeverity(request.status)"
                  />
                </div>
              </template>

              <template #content>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Class Details -->
                  <div>
                    <h4 class="font-semibold text-gray-900 mb-3">Class Details</h4>
                    <div class="space-y-2 text-sm">
                      <div class="flex items-center text-gray-700">
                        <i class="pi pi-tag text-gray-400 mr-2 w-4"></i>
                        <span>{{ request.class.danceStyle.name }}</span>
                      </div>
                      <div v-if="request.class.level.name" class="flex items-center text-gray-700">
                        <i class="pi pi-chart-line text-gray-400 mr-2 w-4"></i>
                        <span>{{ request.class.level.name }}</span>
                      </div>
                      <div v-if="request.class.teacher" class="flex items-center text-gray-700">
                        <i class="pi pi-user text-gray-400 mr-2 w-4"></i>
                        <span>{{ request.class.teacher.fullName }}</span>
                      </div>
                      <div v-if="request.class.schedule.length" class="flex items-start text-gray-700">
                        <i class="pi pi-calendar text-gray-400 mr-2 w-4 mt-0.5"></i>
                        <div>
                          <div v-for="sched in request.class.schedule" :key="sched.id">
                            {{ formatDayOfWeek(sched.dayOfWeek) }}
                            {{ formatTime(sched.startTime) }} - {{ formatTime(sched.endTime) }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Request Details -->
                  <div>
                    <h4 class="font-semibold text-gray-900 mb-3">Request Information</h4>
                    <div class="space-y-2 text-sm">
                      <div>
                        <span class="text-gray-600">Requested:</span>
                        <span class="text-gray-900 ml-2">{{ formatDate(request.requestedAt) }}</span>
                      </div>
                      <div v-if="request.processedAt">
                        <span class="text-gray-600">Processed:</span>
                        <span class="text-gray-900 ml-2">{{ formatDate(request.processedAt) }}</span>
                      </div>
                      <div v-if="request.processedBy">
                        <span class="text-gray-600">Processed by:</span>
                        <span class="text-gray-900 ml-2">{{ request.processedBy.fullName }}</span>
                      </div>
                    </div>

                    <!-- Notes -->
                    <div v-if="request.notes" class="mt-4">
                      <p class="text-xs font-semibold text-gray-700 mb-1">Your Notes:</p>
                      <p class="text-sm text-gray-600 bg-gray-50 p-2 rounded">{{ request.notes }}</p>
                    </div>

                    <!-- Admin Notes -->
                    <div v-if="request.adminNotes" class="mt-3">
                      <p class="text-xs font-semibold text-gray-700 mb-1">Admin Notes:</p>
                      <p class="text-sm text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                        {{ request.adminNotes }}
                      </p>
                    </div>

                    <!-- Denial Reason -->
                    <div v-if="request.denialReason" class="mt-3">
                      <p class="text-xs font-semibold text-red-700 mb-1">Denial Reason:</p>
                      <p class="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                        {{ request.denialReason }}
                      </p>
                    </div>

                    <!-- Conflicts -->
                    <div v-if="request.hasScheduleConflict && request.conflictDetails" class="mt-3">
                      <Message severity="warn" :closable="false">
                        Schedule conflicts detected at time of request
                      </Message>
                    </div>
                  </div>
                </div>
              </template>

              <template #footer>
                <div class="flex justify-end gap-2">
                  <Button
                    v-if="request.status === 'pending' || request.status === 'waitlist'"
                    label="Cancel Request"
                    icon="pi pi-times"
                    severity="danger"
                    text
                    @click="confirmCancelRequest(request)"
                  />
                  <Button
                    v-if="request.status === 'denied'"
                    label="Request Again"
                    icon="pi pi-refresh"
                    severity="secondary"
                    @click="$router.push('/parent/classes')"
                  />
                </div>
              </template>
            </Card>
          </div>
        </div>
      </TabPanel>

      <!-- Active Enrollments Tab -->
      <TabPanel header="Active Enrollments">
        <div class="space-y-4">
          <!-- Student Filter -->
          <div class="bg-white p-4 rounded-lg border border-gray-200">
            <Select
              v-model="selectedStudentFilter"
              :options="[{ id: null, fullName: 'All Students' }, ...students]"
              optionLabel="fullName"
              optionValue="id"
              placeholder="Filter by student"
              class="w-full md:w-96"
            />
          </div>

          <!-- Loading State -->
          <div v-if="loadingEnrollments" class="flex justify-center py-8">
            <ProgressSpinner />
          </div>

          <!-- No Enrollments -->
          <div v-else-if="!filteredEnrollments.length" class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <i class="pi pi-book text-gray-400 text-4xl mb-4"></i>
            <h3 class="text-lg font-semibold text-gray-700 mb-2">No Active Enrollments</h3>
            <p class="text-gray-600 mb-4">No active class enrollments found</p>
            <Button label="Browse Classes" icon="pi pi-search" @click="$router.push('/parent/classes')" />
          </div>

          <!-- Enrollments by Student -->
          <div v-else class="space-y-6">
            <div v-for="student in enrollmentsByStudent" :key="student.studentId" class="space-y-4">
              <h3 class="text-xl font-semibold text-gray-900 border-b pb-2">{{ student.studentName }}</h3>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card
                  v-for="enrollment in student.enrollments"
                  :key="enrollment.id"
                  class="shadow-sm"
                >
                  <template #header>
                    <div
                      class="h-2"
                      :style="{ backgroundColor: enrollment.class_definition?.dance_styles?.color || '#6366f1' }"
                    ></div>
                  </template>

                  <template #content>
                    <div class="space-y-3">
                      <div>
                        <h4 class="font-semibold text-gray-900">{{ enrollment.class_name }}</h4>
                        <Tag
                          v-if="enrollment.status === 'waitlist'"
                          value="Waitlist"
                          severity="info"
                          class="mt-1"
                        />
                      </div>

                      <div class="space-y-2 text-sm">
                        <div class="flex items-center text-gray-700">
                          <i class="pi pi-tag text-gray-400 mr-2"></i>
                          <span>{{ enrollment.class_definition?.dance_styles?.name || 'N/A' }}</span>
                        </div>
                        <div class="flex items-center text-gray-700">
                          <i class="pi pi-user text-gray-400 mr-2"></i>
                          <span>{{ enrollment.teacher_name || 'No teacher assigned' }}</span>
                        </div>
                        <div class="flex items-start text-gray-700">
                          <i class="pi pi-calendar text-gray-400 mr-2 mt-0.5"></i>
                          <div>
                            <div v-if="enrollment.schedule_day !== undefined">
                              {{ formatDayOfWeek(enrollment.schedule_day) }}
                              {{ formatTime(enrollment.schedule_start_time) }} -
                              {{ formatTime(enrollment.schedule_end_time) }}
                            </div>
                            <div v-else class="text-gray-500">Schedule TBD</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>

                  <template #footer>
                    <Button
                      label="View History"
                      icon="pi pi-history"
                      severity="secondary"
                      text
                      size="small"
                      @click="viewEnrollmentHistory(enrollment.student_id)"
                    />
                  </template>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </TabPanel>
    </TabView>

    <!-- Cancel Confirmation Dialog -->
    <Dialog
      v-model:visible="cancelDialog"
      header="Cancel Enrollment Request"
      :modal="true"
      class="w-full max-w-md"
    >
      <div class="space-y-4">
        <p class="text-gray-700">
          Are you sure you want to cancel the enrollment request for
          <strong>{{ requestToCancel?.student.fullName }}</strong> in
          <strong>{{ requestToCancel?.class.name }}</strong>?
        </p>
        <Message severity="warn" :closable="false">
          This action cannot be undone. You will need to submit a new request to enroll in this class.
        </Message>
      </div>

      <template #footer>
        <Button label="No, Keep Request" icon="pi pi-times" severity="secondary" @click="cancelDialog = false" />
        <Button
          label="Yes, Cancel Request"
          icon="pi pi-check"
          severity="danger"
          :loading="cancelling"
          @click="cancelRequest"
        />
      </template>
    </Dialog>

    <!-- Enrollment History Dialog -->
    <Dialog
      v-model:visible="historyDialog"
      header="Enrollment History"
      :modal="true"
      class="w-full max-w-4xl"
    >
      <div v-if="loadingHistory" class="flex justify-center py-8">
        <ProgressSpinner />
      </div>

      <div v-else-if="!enrollmentHistory.length" class="text-center py-8 text-gray-600">
        No enrollment history found
      </div>

      <Timeline v-else :value="enrollmentHistory" align="left" class="mt-4">
        <template #marker="{ item }">
          <div
            class="flex items-center justify-center w-8 h-8 rounded-full"
            :class="{
              'bg-green-500 text-white': item.action === 'enrolled' || item.action === 'approved',
              'bg-blue-500 text-white': item.action === 'requested',
              'bg-red-500 text-white': item.action === 'denied' || item.action === 'dropped',
              'bg-yellow-500 text-white': item.action === 'waitlist_added',
              'bg-gray-500 text-white': item.action === 'cancelled',
            }"
          >
            <i
              :class="{
                'pi pi-check': item.action === 'enrolled' || item.action === 'approved',
                'pi pi-plus': item.action === 'requested',
                'pi pi-times': item.action === 'denied' || item.action === 'dropped',
                'pi pi-list': item.action === 'waitlist_added',
                'pi pi-ban': item.action === 'cancelled',
              }"
            ></i>
          </div>
        </template>

        <template #content="{ item }">
          <Card class="shadow-sm">
            <template #title>
              <div class="flex items-center justify-between">
                <span>{{ formatHistoryAction(item.action) }}</span>
                <small class="text-gray-500 font-normal">{{ formatDate(item.createdAt) }}</small>
              </div>
            </template>
            <template #content>
              <p class="text-sm font-semibold text-gray-900">{{ item.class.name }}</p>
              <p v-if="item.class.danceStyle" class="text-sm text-gray-600">{{ item.class.danceStyle }}</p>
              <p v-if="item.notes" class="text-sm text-gray-600 mt-2">{{ item.notes }}</p>
              <p v-if="item.performedBy" class="text-xs text-gray-500 mt-2">
                by {{ item.performedBy.fullName }}
              </p>
            </template>
          </Card>
        </template>
      </Timeline>

      <template #footer>
        <Button label="Close" icon="pi pi-times" severity="secondary" @click="historyDialog = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useEnrollmentService, type EnrollmentRequest } from '~/composables/useEnrollmentService'
import { useApiService } from '~/composables/useApiService'
import { useToast } from 'primevue/usetoast'

definePageMeta({
  middleware: 'parent',
  layout: 'default',
})

const toast = useToast()
const enrollmentService = useEnrollmentService()
const apiService = useApiService()

// State
const loadingRequests = ref(false)
const loadingEnrollments = ref(false)
const loadingHistory = ref(false)
const cancelling = ref(false)

const enrollmentRequests = ref<EnrollmentRequest[]>([])
const enrollments = ref<any[]>([])
const students = ref<any[]>([])
const enrollmentHistory = ref<any[]>([])

const selectedStudentFilter = ref<string | null>(null)

// Dialog state
const cancelDialog = ref(false)
const requestToCancel = ref<EnrollmentRequest | null>(null)
const historyDialog = ref(false)

// Computed
const filteredEnrollments = computed(() => {
  if (!selectedStudentFilter.value) return enrollments.value
  return enrollments.value.filter(e => e.student_id === selectedStudentFilter.value)
})

const enrollmentsByStudent = computed(() => {
  const grouped: Record<string, any> = {}

  for (const enrollment of filteredEnrollments.value) {
    if (!grouped[enrollment.student_id]) {
      grouped[enrollment.student_id] = {
        studentId: enrollment.student_id,
        studentName: enrollment.student_name,
        enrollments: [],
      }
    }
    grouped[enrollment.student_id].enrollments.push(enrollment)
  }

  return Object.values(grouped)
})

// Methods
const { formatStatus, getStatusSeverity, formatDayOfWeek, formatTime } = enrollmentService

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const formatHistoryAction = (action: string) => {
  const actionMap: Record<string, string> = {
    requested: 'Enrollment Requested',
    approved: 'Request Approved',
    denied: 'Request Denied',
    enrolled: 'Enrolled in Class',
    dropped: 'Dropped from Class',
    waitlist_added: 'Added to Waitlist',
    waitlist_promoted: 'Promoted from Waitlist',
    cancelled: 'Request Cancelled',
  }
  return actionMap[action] || action
}

const fetchEnrollmentRequests = async () => {
  loadingRequests.value = true
  try {
    const data = await enrollmentService.getEnrollmentRequests()
    enrollmentRequests.value = data.enrollmentRequests
  } catch (error) {
    console.error('Error fetching enrollment requests:', error)
  } finally {
    loadingRequests.value = false
  }
}

const fetchEnrollments = async () => {
  loadingEnrollments.value = true
  try {
    const data = await apiService.fetchEnrollments()
    enrollments.value = (data.enrollments || []).filter((e: any) =>
      ['active', 'waitlist'].includes(e.status)
    )
  } catch (error) {
    console.error('Error fetching enrollments:', error)
  } finally {
    loadingEnrollments.value = false
  }
}

const fetchStudents = async () => {
  try {
    const data = await apiService.fetchStudents()
    students.value = (data.students || []).map((s: any) => ({
      ...s,
      fullName: `${s.first_name} ${s.last_name}`,
    }))
  } catch (error) {
    console.error('Error fetching students:', error)
  }
}

const confirmCancelRequest = (request: EnrollmentRequest) => {
  requestToCancel.value = request
  cancelDialog.value = true
}

const cancelRequest = async () => {
  if (!requestToCancel.value) return

  cancelling.value = true
  try {
    await enrollmentService.cancelEnrollmentRequest(requestToCancel.value.id)
    await fetchEnrollmentRequests() // Refresh list
    cancelDialog.value = false
    requestToCancel.value = null
  } catch (error) {
    console.error('Error cancelling request:', error)
  } finally {
    cancelling.value = false
  }
}

const viewEnrollmentHistory = async (studentId: string) => {
  loadingHistory.value = true
  historyDialog.value = true
  enrollmentHistory.value = []

  try {
    const data = await enrollmentService.getEnrollmentHistory(studentId)
    enrollmentHistory.value = data.enrollmentHistory
  } catch (error) {
    console.error('Error fetching enrollment history:', error)
  } finally {
    loadingHistory.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    fetchEnrollmentRequests(),
    fetchEnrollments(),
    fetchStudents(),
  ])
})
</script>
