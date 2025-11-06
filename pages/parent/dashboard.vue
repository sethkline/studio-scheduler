<template>
  <div class="space-y-6">
    <!-- Welcome Header -->
    <div class="card bg-gradient-to-r from-primary-500 to-secondary-500 text-white">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">Welcome back, {{ parentName }}!</h1>
          <p class="text-primary-100 mt-1">Here's what's happening with your dancers</p>
        </div>
        <i class="pi pi-users text-6xl opacity-20"></i>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="card bg-blue-50 border-l-4 border-blue-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">My Dancers</p>
            <p class="text-3xl font-bold text-blue-700">{{ stats.total_students }}</p>
          </div>
          <i class="pi pi-users text-3xl text-blue-300"></i>
        </div>
      </div>

      <div class="card bg-green-50 border-l-4 border-green-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Active Classes</p>
            <p class="text-3xl font-bold text-green-700">{{ stats.active_enrollments }}</p>
          </div>
          <i class="pi pi-calendar text-3xl text-green-300"></i>
        </div>
      </div>

      <div class="card bg-purple-50 border-l-4 border-purple-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Upcoming Recitals</p>
            <p class="text-3xl font-bold text-purple-700">{{ stats.upcoming_recitals }}</p>
          </div>
          <i class="pi pi-star text-3xl text-purple-300"></i>
        </div>
      </div>

      <div class="card bg-orange-50 border-l-4 border-orange-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Action Items</p>
            <p class="text-3xl font-bold text-orange-700">{{ actionItemsCount }}</p>
          </div>
          <i class="pi pi-exclamation-triangle text-3xl text-orange-300"></i>
        </div>
      </div>
    </div>

    <!-- Action Items / Notifications -->
    <div v-if="actionItems.length > 0" class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold">Action Items</h2>
        <Badge :value="actionItemsCount" severity="warning" />
      </div>

      <div class="space-y-3">
        <div
          v-for="item in actionItems"
          :key="item.id"
          class="flex items-start p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded"
        >
          <i :class="item.icon" class="text-yellow-600 text-xl mr-3 mt-1"></i>
          <div class="flex-1">
            <h3 class="font-semibold">{{ item.title }}</h3>
            <p class="text-sm text-gray-600">{{ item.description }}</p>
          </div>
          <Button
            v-if="item.action"
            :label="item.actionLabel"
            size="small"
            @click="item.action"
          />
        </div>
      </div>
    </div>

    <!-- My Dancers -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold">My Dancers</h2>
        <Button
          label="Add Dancer"
          icon="pi pi-plus"
          size="small"
          @click="navigateTo('/parent/students/add')"
        />
      </div>

      <div v-if="loading" class="text-center py-8">
        <i class="pi pi-spin pi-spinner text-4xl text-primary-500"></i>
      </div>

      <div v-else-if="students.length === 0" class="text-center py-8 bg-gray-50 rounded-lg">
        <i class="pi pi-users text-5xl text-gray-400 mb-3"></i>
        <p class="text-gray-600 mb-4">You haven't added any dancers yet</p>
        <Button
          label="Add Your First Dancer"
          icon="pi pi-plus"
          @click="navigateTo('/parent/students/add')"
        />
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="student in students"
          :key="student.id"
          class="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
          @click="viewStudent(student.id)"
        >
          <div class="flex items-center space-x-3 mb-3">
            <Avatar
              :image="student.photo_url"
              :label="getInitials(student.first_name, student.last_name)"
              size="xlarge"
              shape="circle"
              class="bg-primary-100 text-primary-700"
            />
            <div>
              <h3 class="font-semibold text-lg">{{ student.first_name }} {{ student.last_name }}</h3>
              <p class="text-sm text-gray-600">Age {{ calculateAge(student.date_of_birth) }}</p>
            </div>
          </div>

          <div class="space-y-2 text-sm">
            <div class="flex items-center text-gray-600">
              <i class="pi pi-calendar mr-2"></i>
              <span>{{ getEnrollmentCount(student.id) }} classes</span>
            </div>
            <div v-if="getNextClass(student.id)" class="flex items-center text-gray-600">
              <i class="pi pi-clock mr-2"></i>
              <span>Next class: {{ getNextClass(student.id) }}</span>
            </div>
          </div>

          <Button
            label="View Details"
            icon="pi pi-arrow-right"
            iconPos="right"
            class="p-button-text p-button-sm w-full mt-3"
          />
        </div>
      </div>
    </div>

    <!-- Weekly Schedule -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold">This Week's Schedule</h2>
        <Button
          label="View Full Schedule"
          icon="pi pi-calendar"
          size="small"
          class="p-button-outlined"
          @click="navigateTo('/parent/schedule')"
        />
      </div>

      <div v-if="weeklySchedule.length === 0" class="text-center py-8 bg-gray-50 rounded-lg">
        <i class="pi pi-calendar text-4xl text-gray-400 mb-3"></i>
        <p class="text-gray-600">No classes scheduled for this week</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="event in weeklySchedule"
          :key="event.id"
          class="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
        >
          <div class="flex items-center space-x-3">
            <div
              class="w-12 h-12 rounded-lg flex items-center justify-center"
              :style="{ backgroundColor: event.dance_style_color + '33' }"
            >
              <span class="font-bold" :style="{ color: event.dance_style_color }">{{
                getDayAbbreviation(event.day_of_week)
              }}</span>
            </div>
            <div>
              <h3 class="font-semibold">{{ event.class_name }}</h3>
              <p class="text-sm text-gray-600">{{ event.student_name }}</p>
              <p class="text-xs text-gray-500">
                {{ formatTime(event.start_time) }} - {{ formatTime(event.end_time) }}
                <span v-if="event.teacher_name"> • {{ event.teacher_name }}</span>
              </p>
            </div>
          </div>
          <span
            class="px-3 py-1 rounded-full text-xs font-medium"
            :style="{ backgroundColor: event.dance_style_color + '33', color: event.dance_style_color }"
          >
            {{ event.dance_style }}
          </span>
        </div>
      </div>
    </div>

    <!-- Upcoming Recitals -->
    <div v-if="upcomingRecitals.length > 0" class="card">
      <h2 class="text-xl font-bold mb-4">Upcoming Recitals</h2>

      <div class="space-y-4">
        <div
          v-for="recital in upcomingRecitals"
          :key="recital.id"
          class="p-4 border rounded-lg bg-purple-50"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-start space-x-3">
              <i class="pi pi-star text-3xl text-purple-500 mt-1"></i>
              <div>
                <h3 class="font-bold text-lg">{{ recital.name }}</h3>
                <p class="text-gray-600">{{ formatDate(recital.date) }}</p>
                <p class="text-sm text-gray-600 mt-1">{{ recital.location }}</p>
              </div>
            </div>
            <Button
              label="View Details"
              size="small"
              class="p-button-outlined"
              @click="viewRecital(recital.id)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '~/stores/auth'
import type { ParentDashboardStats, StudentProfile, ParentScheduleEvent } from '~/types/parents'

definePageMeta({
  middleware: 'parent',
})

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// State
const loading = ref(true)
const students = ref<StudentProfile[]>([])
const weeklySchedule = ref<ParentScheduleEvent[]>([])
const upcomingRecitals = ref<any[]>([])
const stats = ref<ParentDashboardStats>({
  total_students: 0,
  active_enrollments: 0,
  upcoming_recitals: 0,
  pending_payments: 0,
  outstanding_costumes: 0,
  required_volunteer_hours: 0,
  completed_volunteer_hours: 0,
})

// Computed
const parentName = computed(() => authStore.fullName || 'Parent')

const actionItems = computed(() => {
  const items = []

  if (stats.value.pending_payments > 0) {
    items.push({
      id: 'payments',
      icon: 'pi pi-dollar',
      title: 'Pending Payments',
      description: `You have ${stats.value.pending_payments} pending payment(s)`,
      actionLabel: 'Pay Now',
      action: () => navigateTo('/parent/payments'),
    })
  }

  if (stats.value.outstanding_costumes > 0) {
    items.push({
      id: 'costumes',
      icon: 'pi pi-shopping-bag',
      title: 'Costume Pickup',
      description: `${stats.value.outstanding_costumes} costume(s) ready for pickup`,
      actionLabel: 'View Details',
      action: () => navigateTo('/parent/costumes'),
    })
  }

  const volunteerDeficit = stats.value.required_volunteer_hours - stats.value.completed_volunteer_hours
  if (volunteerDeficit > 0) {
    items.push({
      id: 'volunteer',
      icon: 'pi pi-users',
      title: 'Volunteer Hours Needed',
      description: `You need ${volunteerDeficit} more volunteer hour(s)`,
      actionLabel: 'Sign Up',
      action: () => navigateTo('/parent/volunteer'),
    })
  }

  return items
})

const actionItemsCount = computed(() => actionItems.value.length)

// Load data
onMounted(async () => {
  await loadDashboardData()
})

async function loadDashboardData() {
  loading.value = true
  try {
    const { data, error } = await useFetch('/api/parent/dashboard')

    if (error.value) {
      throw new Error(error.value.message || 'Failed to load dashboard data')
    }

    if (data.value) {
      students.value = data.value.students || []
      weeklySchedule.value = data.value.weeklySchedule || []
      upcomingRecitals.value = data.value.upcomingRecitals || []
      stats.value = data.value.stats || {
        total_students: 0,
        active_enrollments: 0,
        upcoming_recitals: 0,
        pending_payments: 0,
        outstanding_costumes: 0,
        required_volunteer_hours: 0,
        completed_volunteer_hours: 0,
      }
    }
  } catch (error: any) {
    console.error('Error loading dashboard data:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load dashboard data',
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

// Helpers
function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase()
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

function getEnrollmentCount(studentId: string): number {
  // TODO: Get actual enrollment count
  return 0
}

function getNextClass(studentId: string): string | null {
  // TODO: Get next class
  return null
}

function getDayAbbreviation(dayOfWeek: number): string {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  return days[dayOfWeek]
}

function formatTime(timeString: string): string {
  if (!timeString) return ''
  const [hours, minutes] = timeString.split(':')
  const date = new Date()
  date.setHours(parseInt(hours))
  date.setMinutes(parseInt(minutes))
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// Navigation
function viewStudent(studentId: string) {
  navigateTo(`/parent/students/${studentId}`)
}

function viewRecital(recitalId: string) {
  navigateTo(`/public/recitals/${recitalId}`)
}
</script>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow p-6;
}
</style>
