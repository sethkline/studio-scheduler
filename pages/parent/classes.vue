<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Browse Classes</h1>
      <p class="text-gray-600">Find and enroll your dancer in available classes</p>
    </div>

    <!-- Student Selector -->
    <div class="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <label class="block text-sm font-medium text-gray-700 mb-2">Select Student</label>
      <Select
        v-model="selectedStudentId"
        :options="students"
        optionLabel="fullName"
        optionValue="id"
        placeholder="Choose a student"
        class="w-full md:w-96"
        @change="onStudentChange"
      />
    </div>

    <!-- Filters -->
    <div class="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Dance Style Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Dance Style</label>
          <Select
            v-model="filters.danceStyleId"
            :options="danceStyles"
            optionLabel="name"
            optionValue="id"
            placeholder="All Styles"
            class="w-full"
            showClear
            @change="applyFilters"
          />
        </div>

        <!-- Level Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Level</label>
          <Select
            v-model="filters.levelId"
            :options="levels"
            optionLabel="name"
            optionValue="id"
            placeholder="All Levels"
            class="w-full"
            showClear
            @change="applyFilters"
          />
        </div>

        <!-- Day Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
          <Select
            v-model="filters.dayOfWeek"
            :options="daysOfWeek"
            optionLabel="label"
            optionValue="value"
            placeholder="All Days"
            class="w-full"
            showClear
            @change="applyFilters"
          />
        </div>

        <!-- Age-Appropriate Toggle -->
        <div class="flex items-end">
          <div class="flex items-center h-10">
            <Checkbox v-model="filters.ageAppropriate" inputId="ageFilter" binary @change="applyFilters" />
            <label for="ageFilter" class="ml-2 text-sm text-gray-700">Age-appropriate only</label>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <ProgressSpinner />
    </div>

    <!-- No Student Selected -->
    <div v-else-if="!selectedStudentId" class="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
      <i class="pi pi-info-circle text-blue-500 text-3xl mb-2"></i>
      <p class="text-blue-700">Please select a student to view available classes</p>
    </div>

    <!-- Classes Grid -->
    <div v-else-if="filteredClasses.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="classItem in filteredClasses"
        :key="classItem.id"
        class="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
      >
        <!-- Class Header with Style Color -->
        <div
          class="h-2"
          :style="{ backgroundColor: classItem.danceStyle?.color || '#6366f1' }"
        ></div>

        <div class="p-6">
          <!-- Class Name -->
          <h3 class="text-xl font-bold text-gray-900 mb-2">{{ classItem.name }}</h3>

          <!-- Dance Style & Level -->
          <div class="flex gap-2 mb-3">
            <Tag
              v-if="classItem.danceStyle"
              :value="classItem.danceStyle.name"
              :style="{ backgroundColor: classItem.danceStyle.color || '#6366f1' }"
            />
            <Tag v-if="classItem.level" :value="classItem.level.name" severity="secondary" />
          </div>

          <!-- Description -->
          <p v-if="classItem.description" class="text-gray-600 text-sm mb-4 line-clamp-2">
            {{ classItem.description }}
          </p>

          <!-- Class Details -->
          <div class="space-y-2 mb-4">
            <!-- Teacher -->
            <div v-if="classItem.teacher" class="flex items-center text-sm text-gray-700">
              <i class="pi pi-user text-gray-400 mr-2"></i>
              <span>{{ classItem.teacher.fullName }}</span>
            </div>

            <!-- Schedule -->
            <div v-if="classItem.schedule && classItem.schedule.length > 0" class="text-sm text-gray-700">
              <div v-for="(sched, idx) in classItem.schedule" :key="idx" class="flex items-center">
                <i class="pi pi-calendar text-gray-400 mr-2"></i>
                <span>
                  {{ formatDayOfWeek(sched.dayOfWeek) }} {{ formatTime(sched.startTime) }} - {{ formatTime(sched.endTime) }}
                </span>
              </div>
            </div>

            <!-- Duration -->
            <div v-if="classItem.duration" class="flex items-center text-sm text-gray-700">
              <i class="pi pi-clock text-gray-400 mr-2"></i>
              <span>{{ classItem.duration }} minutes</span>
            </div>

            <!-- Age Range -->
            <div v-if="classItem.minAge || classItem.maxAge" class="flex items-center text-sm text-gray-700">
              <i class="pi pi-users text-gray-400 mr-2"></i>
              <span>
                Ages {{ classItem.minAge || '?' }} - {{ classItem.maxAge || '?' }}
              </span>
            </div>

            <!-- Capacity -->
            <div class="flex items-center text-sm">
              <i class="pi pi-chart-bar text-gray-400 mr-2"></i>
              <span
                :class="{
                  'text-red-600 font-medium': classItem.isFull,
                  'text-green-600': !classItem.isFull && classItem.availableSpots < 5,
                  'text-gray-700': !classItem.isFull && classItem.availableSpots >= 5
                }"
              >
                {{ classItem.isFull ? 'Class Full' : `${classItem.availableSpots} spots available` }}
              </span>
            </div>
          </div>

          <!-- Enrollment Status -->
          <div v-if="getEnrollmentStatus(classItem.id)" class="mb-3">
            <Tag
              :value="getEnrollmentStatus(classItem.id)?.label"
              :severity="getEnrollmentStatus(classItem.id)?.severity"
            />
          </div>

          <!-- Action Button -->
          <Button
            :label="classItem.isFull ? 'Join Waitlist' : 'Enroll'"
            :icon="classItem.isFull ? 'pi pi-list' : 'pi pi-plus'"
            class="w-full"
            :severity="classItem.isFull ? 'secondary' : 'primary'"
            :disabled="!!getEnrollmentStatus(classItem.id)"
            @click="openEnrollmentDialog(classItem)"
          />
        </div>
      </div>
    </div>

    <!-- No Classes Found -->
    <div v-else class="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
      <i class="pi pi-search text-gray-400 text-4xl mb-4"></i>
      <h3 class="text-lg font-semibold text-gray-700 mb-2">No Classes Found</h3>
      <p class="text-gray-600 mb-4">Try adjusting your filters to see more classes</p>
      <Button label="Clear Filters" icon="pi pi-times" severity="secondary" @click="clearFilters" />
    </div>

    <!-- Enrollment Request Dialog -->
    <Dialog
      v-model:visible="enrollmentDialog"
      :header="`Enroll ${selectedStudent?.fullName} in ${selectedClass?.name}`"
      :modal="true"
      class="w-full max-w-2xl"
    >
      <div class="space-y-4">
        <!-- Class Summary -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-2">Class Details</h4>
          <div class="space-y-1 text-sm">
            <p><strong>Style:</strong> {{ selectedClass?.danceStyle?.name }}</p>
            <p v-if="selectedClass?.level"><strong>Level:</strong> {{ selectedClass.level.name }}</p>
            <p v-if="selectedClass?.teacher"><strong>Teacher:</strong> {{ selectedClass.teacher.fullName }}</p>
            <p v-if="selectedClass?.schedule?.[0]">
              <strong>Schedule:</strong>
              {{ formatDayOfWeek(selectedClass.schedule[0].dayOfWeek) }}
              {{ formatTime(selectedClass.schedule[0].startTime) }} -
              {{ formatTime(selectedClass.schedule[0].endTime) }}
            </p>
          </div>
        </div>

        <!-- Conflict Warnings -->
        <div v-if="validationResult?.warnings?.length" class="space-y-2">
          <Message
            v-for="(warning, idx) in validationResult.warnings"
            :key="idx"
            severity="warn"
            :closable="false"
          >
            {{ warning.message }}
          </Message>
        </div>

        <!-- Conflicts -->
        <div v-if="validationResult?.conflicts?.length" class="space-y-2">
          <Message
            v-for="(conflict, idx) in validationResult.conflicts"
            :key="idx"
            severity="error"
            :closable="false"
          >
            {{ conflict.message }}
          </Message>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <Textarea
            v-model="enrollmentNotes"
            rows="3"
            class="w-full"
            placeholder="Any additional information or special requests..."
          />
        </div>

        <!-- Waitlist Notice -->
        <Message v-if="selectedClass?.isFull" severity="info" :closable="false">
          This class is currently full. Your request will be added to the waitlist.
        </Message>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" severity="secondary" @click="closeEnrollmentDialog" />
        <Button
          :label="selectedClass?.isFull ? 'Join Waitlist' : 'Submit Request'"
          icon="pi pi-check"
          :loading="submitting"
          :disabled="validationResult?.conflicts?.length > 0"
          @click="submitEnrollmentRequest"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useEnrollmentService, type ClassListItem } from '~/composables/useEnrollmentService'
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
const loading = ref(false)
const submitting = ref(false)
const students = ref<any[]>([])
const selectedStudentId = ref<string | null>(null)
const allClasses = ref<ClassListItem[]>([])
const danceStyles = ref<any[]>([])
const levels = ref<any[]>([])
const enrollmentRequests = ref<any[]>([])
const currentEnrollments = ref<any[]>([])

// Filters
const filters = ref({
  danceStyleId: null,
  levelId: null,
  dayOfWeek: null,
  ageAppropriate: true,
})

const daysOfWeek = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
]

// Dialog
const enrollmentDialog = ref(false)
const selectedClass = ref<ClassListItem | null>(null)
const enrollmentNotes = ref('')
const validationResult = ref<any>(null)

// Computed
const selectedStudent = computed(() => {
  return students.value.find(s => s.id === selectedStudentId.value)
})

const filteredClasses = computed(() => {
  let classes = allClasses.value

  // Filter by dance style
  if (filters.value.danceStyleId) {
    classes = classes.filter(c => c.danceStyle?.id === filters.value.danceStyleId)
  }

  // Filter by level
  if (filters.value.levelId) {
    classes = classes.filter(c => c.level?.id === filters.value.levelId)
  }

  // Filter by day
  if (filters.value.dayOfWeek !== null) {
    classes = classes.filter(c =>
      c.schedule?.some(s => s.dayOfWeek === filters.value.dayOfWeek)
    )
  }

  // Filter by age
  if (filters.value.ageAppropriate && selectedStudent.value?.age) {
    classes = classes.filter(c => {
      if (!c.minAge && !c.maxAge) return true
      const age = selectedStudent.value.age
      const meetsMin = !c.minAge || age >= c.minAge
      const meetsMax = !c.maxAge || age <= c.maxAge
      return meetsMin && meetsMax
    })
  }

  return classes
})

// Methods
const { formatDayOfWeek, formatTime } = enrollmentService

const fetchData = async () => {
  loading.value = true
  try {
    // Fetch students
    const studentsData = await apiService.fetchStudents()
    students.value = (studentsData.students || []).map((s: any) => ({
      ...s,
      fullName: `${s.first_name} ${s.last_name}`,
      age: s.date_of_birth
        ? Math.floor(
            (new Date().getTime() - new Date(s.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          )
        : null,
    }))

    // Auto-select first student
    if (students.value.length > 0) {
      selectedStudentId.value = students.value[0].id
    }

    // Fetch classes
    await loadClasses()

    // Fetch dance styles and levels for filters
    const stylesData = await $fetch('/api/dance-styles')
    danceStyles.value = stylesData?.danceStyles || []

    const levelsData = await $fetch('/api/class-levels')
    levels.value = levelsData?.classLevels || []
  } catch (error: any) {
    console.error('Error fetching data:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load data',
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

const loadClasses = async () => {
  try {
    allClasses.value = await enrollmentService.getAvailableClasses()
  } catch (error) {
    console.error('Error loading classes:', error)
  }
}

const onStudentChange = async () => {
  if (!selectedStudentId.value) return

  // Load enrollment requests and current enrollments for this student
  try {
    const requests = await enrollmentService.getEnrollmentRequests()
    enrollmentRequests.value = requests.enrollmentRequests.filter(
      r => r.student.id === selectedStudentId.value
    )

    const enrollments = await apiService.fetchEnrollments()
    currentEnrollments.value = (enrollments.enrollments || []).filter(
      (e: any) => e.student_id === selectedStudentId.value && ['active', 'waitlist'].includes(e.status)
    )
  } catch (error) {
    console.error('Error loading student enrollments:', error)
  }
}

const getEnrollmentStatus = (classInstanceId: string) => {
  // Check if already enrolled
  const enrollment = currentEnrollments.value.find(
    (e: any) => e.class_instance_id === classInstanceId
  )
  if (enrollment) {
    return {
      label: enrollment.status === 'waitlist' ? 'On Waitlist' : 'Enrolled',
      severity: enrollment.status === 'waitlist' ? 'info' : 'success',
    }
  }

  // Check if has pending request
  const request = enrollmentRequests.value.find(
    r => r.class.id === classInstanceId && ['pending', 'waitlist'].includes(r.status)
  )
  if (request) {
    return {
      label: request.status === 'waitlist' ? 'Waitlist Requested' : 'Pending Approval',
      severity: request.status === 'waitlist' ? 'info' : 'warning',
    }
  }

  return null
}

const openEnrollmentDialog = (classItem: ClassListItem) => {
  selectedClass.value = classItem
  enrollmentNotes.value = ''
  validationResult.value = null
  enrollmentDialog.value = true

  // TODO: Call validation API to check conflicts
  // For now, we'll do basic client-side checks
}

const closeEnrollmentDialog = () => {
  enrollmentDialog.value = false
  selectedClass.value = null
  enrollmentNotes.value = ''
  validationResult.value = null
}

const submitEnrollmentRequest = async () => {
  if (!selectedStudentId.value || !selectedClass.value) return

  submitting.value = true
  try {
    await enrollmentService.createEnrollmentRequest({
      student_id: selectedStudentId.value,
      class_instance_id: selectedClass.value.id,
      notes: enrollmentNotes.value,
    })

    toast.add({
      severity: 'success',
      summary: 'Request Submitted',
      detail: selectedClass.value.isFull
        ? 'Student added to waitlist'
        : 'Enrollment request submitted for approval',
      life: 5000,
    })

    closeEnrollmentDialog()
    await onStudentChange() // Reload student data
  } catch (error: any) {
    // Error toast already shown by service
  } finally {
    submitting.value = false
  }
}

const applyFilters = () => {
  // Filters are reactive, so just trigger re-computation
}

const clearFilters = () => {
  filters.value = {
    danceStyleId: null,
    levelId: null,
    dayOfWeek: null,
    ageAppropriate: true,
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
