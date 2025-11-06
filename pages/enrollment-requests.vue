<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Enrollment Requests</h1>
      <p class="text-gray-600">Review and approve parent enrollment requests</p>
    </div>

    <!-- Summary Cards -->
    <div v-if="summary" class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <Card class="shadow-sm">
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Pending</p>
              <p class="text-2xl font-bold text-yellow-600">{{ summary.pending }}</p>
            </div>
            <i class="pi pi-clock text-yellow-400 text-3xl"></i>
          </div>
        </template>
      </Card>

      <Card class="shadow-sm">
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Waitlist</p>
              <p class="text-2xl font-bold text-blue-600">{{ summary.waitlist }}</p>
            </div>
            <i class="pi pi-list text-blue-400 text-3xl"></i>
          </div>
        </template>
      </Card>

      <Card class="shadow-sm">
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Approved</p>
              <p class="text-2xl font-bold text-green-600">{{ summary.approved }}</p>
            </div>
            <i class="pi pi-check text-green-400 text-3xl"></i>
          </div>
        </template>
      </Card>

      <Card class="shadow-sm">
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Denied</p>
              <p class="text-2xl font-bold text-red-600">{{ summary.denied }}</p>
            </div>
            <i class="pi pi-times text-red-400 text-3xl"></i>
          </div>
        </template>
      </Card>

      <Card class="shadow-sm">
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Total</p>
              <p class="text-2xl font-bold text-gray-900">{{ summary.total }}</p>
            </div>
            <i class="pi pi-inbox text-gray-400 text-3xl"></i>
          </div>
        </template>
      </Card>
    </div>

    <!-- Filters -->
    <div class="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
          <Select
            v-model="statusFilter"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All Statuses"
            class="w-full"
            showClear
            @change="fetchRequests"
          />
        </div>

        <div class="flex items-end">
          <Button
            label="Refresh"
            icon="pi pi-refresh"
            severity="secondary"
            @click="fetchRequests"
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- No Requests -->
    <div v-else-if="!requests.length" class="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
      <i class="pi pi-inbox text-gray-400 text-4xl mb-4"></i>
      <h3 class="text-lg font-semibold text-gray-700 mb-2">No Enrollment Requests</h3>
      <p class="text-gray-600">There are no enrollment requests matching your filters</p>
    </div>

    <!-- Requests List -->
    <div v-else class="space-y-4">
      <Card
        v-for="request in requests"
        :key="request.id"
        class="shadow-md"
      >
        <template #header>
          <div class="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 border-b border-gray-200 gap-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-lg font-semibold text-gray-900">{{ request.class.name }}</h3>
                <Tag
                  :value="formatStatus(request.status)"
                  :severity="getStatusSeverity(request.status)"
                />
              </div>
              <p class="text-sm text-gray-600">
                <strong>Student:</strong> {{ request.student.fullName }}
                <span v-if="request.student.age" class="ml-2">({{ request.student.age }} years old)</span>
              </p>
              <p class="text-sm text-gray-600">
                <strong>Parent:</strong> {{ request.guardian.fullName }}
                <span v-if="request.guardian.email" class="ml-2">• {{ request.guardian.email }}</span>
              </p>
            </div>

            <div class="flex gap-2">
              <Button
                v-if="request.status === 'pending' || request.status === 'waitlist'"
                label="Approve"
                icon="pi pi-check"
                severity="success"
                @click="openApproveDialog(request)"
              />
              <Button
                v-if="request.status === 'pending' || request.status === 'waitlist'"
                label="Deny"
                icon="pi pi-times"
                severity="danger"
                @click="openDenyDialog(request)"
              />
              <Button
                label="Details"
                icon="pi pi-info-circle"
                severity="secondary"
                text
                @click="openDetailsDialog(request)"
              />
            </div>
          </div>
        </template>

        <template #content>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Class Details -->
            <div>
              <h4 class="font-semibold text-gray-900 mb-3">Class Information</h4>
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
                <div class="flex items-center text-gray-700">
                  <i class="pi pi-chart-bar text-gray-400 mr-2 w-4"></i>
                  <span>
                    {{ request.class.currentEnrollments }}/{{ request.class.maxStudents || '∞' }} enrolled
                    <span v-if="request.class.isFull" class="text-red-600 font-medium ml-1">(FULL)</span>
                    <span v-else class="text-green-600 ml-1">({{ request.class.availableSpots }} spots)</span>
                  </span>
                </div>
                <div v-if="request.class.minAge || request.class.maxAge" class="flex items-center text-gray-700">
                  <i class="pi pi-users text-gray-400 mr-2 w-4"></i>
                  <span>Ages {{ request.class.minAge || '?' }}-{{ request.class.maxAge || '?' }}</span>
                </div>
              </div>
            </div>

            <!-- Request Details -->
            <div>
              <h4 class="font-semibold text-gray-900 mb-3">Request Details</h4>
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
                  <span class="text-gray-900 ml-2">
                    {{ request.processedBy.fullName }} ({{ request.processedBy.role }})
                  </span>
                </div>
              </div>

              <!-- Parent Notes -->
              <div v-if="request.notes" class="mt-4">
                <p class="text-xs font-semibold text-gray-700 mb-1">Parent Notes:</p>
                <p class="text-sm text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                  {{ request.notes }}
                </p>
              </div>
            </div>

            <!-- Warnings/Conflicts -->
            <div>
              <h4 class="font-semibold text-gray-900 mb-3">Validation</h4>

              <!-- Age Check -->
              <div v-if="!checkAgeEligibility(request)" class="mb-2">
                <Message severity="warn" :closable="false">
                  Student age ({{ request.student.age }}) is outside the recommended range
                  ({{ request.class.minAge }}-{{ request.class.maxAge }})
                </Message>
              </div>

              <!-- Capacity Warning -->
              <div v-if="request.class.isFull" class="mb-2">
                <Message severity="warn" :closable="false">
                  Class is at full capacity. Approval will add student to waitlist.
                </Message>
              </div>

              <!-- Schedule Conflicts -->
              <div v-if="request.hasScheduleConflict" class="mb-2">
                <Message severity="warn" :closable="false">
                  Schedule conflicts detected at time of request
                </Message>
                <div v-if="request.conflictDetails?.warnings" class="mt-2 space-y-1">
                  <div
                    v-for="(warning, idx) in request.conflictDetails.warnings"
                    :key="idx"
                    class="text-xs text-yellow-700 bg-yellow-50 p-2 rounded"
                  >
                    {{ warning.message }}
                  </div>
                </div>
              </div>

              <!-- No Issues -->
              <div v-if="!request.hasScheduleConflict && !request.class.isFull && checkAgeEligibility(request)">
                <Message severity="success" :closable="false">
                  No issues detected. Student eligible for enrollment.
                </Message>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Approve Dialog -->
    <Dialog
      v-model:visible="approveDialog"
      header="Approve Enrollment Request"
      :modal="true"
      class="w-full max-w-2xl"
    >
      <div class="space-y-4">
        <p class="text-gray-700">
          Approve enrollment request for <strong>{{ selectedRequest?.student.fullName }}</strong> in
          <strong>{{ selectedRequest?.class.name }}</strong>?
        </p>

        <div v-if="selectedRequest?.class.isFull">
          <Message severity="warn" :closable="false">
            Class is full. Student will be added to waitlist instead of active enrollment.
          </Message>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Admin Notes (Optional)
          </label>
          <Textarea
            v-model="adminNotes"
            rows="3"
            class="w-full"
            placeholder="Add any notes about this approval..."
          />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" severity="secondary" @click="approveDialog = false" />
        <Button
          :label="selectedRequest?.class.isFull ? 'Add to Waitlist' : 'Approve & Enroll'"
          icon="pi pi-check"
          severity="success"
          :loading="processing"
          @click="approveRequest"
        />
      </template>
    </Dialog>

    <!-- Deny Dialog -->
    <Dialog
      v-model:visible="denyDialog"
      header="Deny Enrollment Request"
      :modal="true"
      class="w-full max-w-2xl"
    >
      <div class="space-y-4">
        <p class="text-gray-700">
          Deny enrollment request for <strong>{{ selectedRequest?.student.fullName }}</strong> in
          <strong>{{ selectedRequest?.class.name }}</strong>?
        </p>

        <Message severity="warn" :closable="false">
          The parent will be notified of the denial. Please provide a clear reason.
        </Message>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Denial Reason <span class="text-red-600">*</span>
          </label>
          <Textarea
            v-model="denialReason"
            rows="3"
            class="w-full"
            placeholder="Explain why this request is being denied..."
            :class="{ 'border-red-500': denialReasonError }"
          />
          <small v-if="denialReasonError" class="text-red-600">{{ denialReasonError }}</small>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Admin Notes (Optional)
          </label>
          <Textarea
            v-model="adminNotes"
            rows="2"
            class="w-full"
            placeholder="Internal notes (not shown to parent)..."
          />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" severity="secondary" @click="denyDialog = false" />
        <Button
          label="Deny Request"
          icon="pi pi-times"
          severity="danger"
          :loading="processing"
          @click="denyRequest"
        />
      </template>
    </Dialog>

    <!-- Details Dialog -->
    <Dialog
      v-model:visible="detailsDialog"
      :header="`Request Details - ${selectedRequest?.student.fullName}`"
      :modal="true"
      class="w-full max-w-3xl"
    >
      <div v-if="selectedRequest" class="space-y-4">
        <!-- Student Info -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-2">Student Information</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-600">Name:</span>
              <span class="text-gray-900 ml-2">{{ selectedRequest.student.fullName }}</span>
            </div>
            <div>
              <span class="text-gray-600">Age:</span>
              <span class="text-gray-900 ml-2">{{ selectedRequest.student.age }} years</span>
            </div>
            <div v-if="selectedRequest.student.dateOfBirth">
              <span class="text-gray-600">Date of Birth:</span>
              <span class="text-gray-900 ml-2">{{ formatDate(selectedRequest.student.dateOfBirth) }}</span>
            </div>
          </div>
        </div>

        <!-- Guardian Info -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-2">Guardian Information</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-600">Name:</span>
              <span class="text-gray-900 ml-2">{{ selectedRequest.guardian.fullName }}</span>
            </div>
            <div v-if="selectedRequest.guardian.email">
              <span class="text-gray-600">Email:</span>
              <span class="text-gray-900 ml-2">{{ selectedRequest.guardian.email }}</span>
            </div>
            <div v-if="selectedRequest.guardian.phone">
              <span class="text-gray-600">Phone:</span>
              <span class="text-gray-900 ml-2">{{ selectedRequest.guardian.phone }}</span>
            </div>
          </div>
        </div>

        <!-- Full Conflict Details -->
        <div v-if="selectedRequest.conflictDetails" class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 class="font-semibold text-yellow-900 mb-2">Conflict Details</h4>
          <div v-if="selectedRequest.conflictDetails.conflicts?.length" class="space-y-2 mb-3">
            <p class="text-sm font-semibold text-yellow-800">Conflicts:</p>
            <div
              v-for="(conflict, idx) in selectedRequest.conflictDetails.conflicts"
              :key="idx"
              class="text-sm text-yellow-800 bg-white p-2 rounded"
            >
              {{ conflict.message }}
            </div>
          </div>
          <div v-if="selectedRequest.conflictDetails.warnings?.length" class="space-y-2">
            <p class="text-sm font-semibold text-yellow-800">Warnings:</p>
            <div
              v-for="(warning, idx) in selectedRequest.conflictDetails.warnings"
              :key="idx"
              class="text-sm text-yellow-700 bg-white p-2 rounded"
            >
              {{ warning.message }}
            </div>
          </div>
        </div>

        <!-- Admin Notes (if processed) -->
        <div v-if="selectedRequest.adminNotes" class="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 class="font-semibold text-blue-900 mb-2">Admin Notes</h4>
          <p class="text-sm text-blue-800">{{ selectedRequest.adminNotes }}</p>
        </div>

        <!-- Denial Reason (if denied) -->
        <div v-if="selectedRequest.denialReason" class="bg-red-50 p-4 rounded-lg border border-red-200">
          <h4 class="font-semibold text-red-900 mb-2">Denial Reason</h4>
          <p class="text-sm text-red-800">{{ selectedRequest.denialReason }}</p>
        </div>
      </div>

      <template #footer>
        <Button label="Close" icon="pi pi-times" severity="secondary" @click="detailsDialog = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEnrollmentService, type EnrollmentRequest } from '~/composables/useEnrollmentService'
import { useToast } from 'primevue/usetoast'

definePageMeta({
  middleware: 'staff',
  layout: 'default',
})

const toast = useToast()
const enrollmentService = useEnrollmentService()

// State
const loading = ref(false)
const processing = ref(false)
const requests = ref<EnrollmentRequest[]>([])
const summary = ref<any>(null)
const statusFilter = ref<string | null>(null)

const statusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Waitlist', value: 'waitlist' },
  { label: 'Approved', value: 'approved' },
  { label: 'Denied', value: 'denied' },
  { label: 'Cancelled', value: 'cancelled' },
]

// Dialog state
const approveDialog = ref(false)
const denyDialog = ref(false)
const detailsDialog = ref(false)
const selectedRequest = ref<EnrollmentRequest | null>(null)
const adminNotes = ref('')
const denialReason = ref('')
const denialReasonError = ref('')

// Methods
const { formatStatus, getStatusSeverity, formatDayOfWeek, formatTime } = enrollmentService

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const checkAgeEligibility = (request: EnrollmentRequest) => {
  if (!request.student.age) return true
  if (!request.class.minAge && !request.class.maxAge) return true

  const age = request.student.age
  const meetsMin = !request.class.minAge || age >= request.class.minAge
  const meetsMax = !request.class.maxAge || age <= request.class.maxAge
  return meetsMin && meetsMax
}

const fetchRequests = async () => {
  loading.value = true
  try {
    const filters: any = {}
    if (statusFilter.value) {
      filters.status = statusFilter.value
    }

    const data = await enrollmentService.getStaffEnrollmentRequests(filters)
    requests.value = data.enrollmentRequests
    summary.value = data.summary
  } catch (error) {
    console.error('Error fetching requests:', error)
  } finally {
    loading.value = false
  }
}

const openApproveDialog = (request: EnrollmentRequest) => {
  selectedRequest.value = request
  adminNotes.value = ''
  approveDialog.value = true
}

const openDenyDialog = (request: EnrollmentRequest) => {
  selectedRequest.value = request
  denialReason.value = ''
  adminNotes.value = ''
  denialReasonError.value = ''
  denyDialog.value = true
}

const openDetailsDialog = (request: EnrollmentRequest) => {
  selectedRequest.value = request
  detailsDialog.value = true
}

const approveRequest = async () => {
  if (!selectedRequest.value) return

  processing.value = true
  try {
    await enrollmentService.approveEnrollmentRequest(
      selectedRequest.value.id,
      adminNotes.value
    )

    await fetchRequests()
    approveDialog.value = false
    selectedRequest.value = null
    adminNotes.value = ''
  } catch (error) {
    console.error('Error approving request:', error)
  } finally {
    processing.value = false
  }
}

const denyRequest = async () => {
  if (!selectedRequest.value) return

  // Validate denial reason
  if (!denialReason.value.trim()) {
    denialReasonError.value = 'Denial reason is required'
    return
  }

  denialReasonError.value = ''
  processing.value = true

  try {
    await enrollmentService.denyEnrollmentRequest(
      selectedRequest.value.id,
      denialReason.value,
      adminNotes.value
    )

    await fetchRequests()
    denyDialog.value = false
    selectedRequest.value = null
    denialReason.value = ''
    adminNotes.value = ''
  } catch (error) {
    console.error('Error denying request:', error)
  } finally {
    processing.value = false
  }
}

onMounted(() => {
  fetchRequests()
})
</script>
