<template>
  <div class="teacher-dashboard">
    <!-- Welcome Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Welcome back{{ profile?.first_name ? `, ${profile.first_name}` : '' }}!
      </h1>
      <p class="text-gray-600">Here's your teaching schedule and class overview</p>
    </div>

    <!-- Onboarding Checklist (shown for new teachers) -->
    <TeacherOnboardingChecklist v-if="showOnboarding" class="mb-8" @complete="handleOnboardingComplete" />

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <DashboardStatCard
        title="My Classes"
        :value="stats.totalClasses"
        icon="pi-book"
        color="blue"
        :loading="loading"
      />
      <DashboardStatCard
        title="Total Students"
        :value="stats.totalStudents"
        icon="pi-users"
        color="green"
        :loading="loading"
      />
      <DashboardStatCard
        title="Classes Today"
        :value="stats.classesToday"
        icon="pi-calendar"
        color="purple"
        :loading="loading"
      />
      <DashboardStatCard
        title="This Week"
        :value="stats.classesThisWeek"
        icon="pi-clock"
        color="orange"
        :loading="loading"
      />
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column - Today's Schedule & This Week -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Today's Schedule -->
        <Card class="dashboard-card">
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-calendar-plus text-primary"></i>
              <span>Today's Schedule</span>
            </div>
          </template>
          <template #content>
            <div v-if="loading" class="text-center py-4">
              <ProgressSpinner style="width: 40px; height: 40px" />
            </div>
            <div v-else-if="todaysClasses.length === 0" class="text-center py-8 text-gray-500">
              <i class="pi pi-calendar text-4xl mb-2"></i>
              <p>No classes scheduled for today</p>
              <p class="text-sm mt-2">Enjoy your day off!</p>
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="classItem in todaysClasses"
                :key="classItem.id"
                class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                @click="navigateTo(`/teacher/classes/${classItem.id}`)"
              >
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <div
                      class="w-3 h-3 rounded-full"
                      :style="{ backgroundColor: classItem.dance_style_color || '#6B46C1' }"
                    ></div>
                    <span class="font-semibold text-gray-900">{{ classItem.name }}</span>
                  </div>
                  <div class="text-sm text-gray-600">
                    {{ formatTime(classItem.start_time) }} - {{ formatTime(classItem.end_time) }}
                  </div>
                  <div class="text-xs text-gray-500 mt-1 flex items-center gap-3">
                    <span v-if="classItem.room">
                      <i class="pi pi-map-marker mr-1"></i>{{ classItem.room }}
                    </span>
                    <span v-if="classItem.student_count !== undefined">
                      <i class="pi pi-users mr-1"></i>{{ classItem.student_count }} students
                    </span>
                  </div>
                </div>
                <div class="text-right">
                  <Button
                    label="Take Attendance"
                    icon="pi pi-check"
                    class="p-button-sm"
                    @click.stop="takeAttendance(classItem.id)"
                  />
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- This Week's Schedule -->
        <Card class="dashboard-card">
          <template #title>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i class="pi pi-calendar text-primary"></i>
                <span>This Week's Schedule</span>
              </div>
              <Button
                label="View Full Schedule"
                icon="pi pi-external-link"
                class="p-button-text p-button-sm"
                @click="navigateTo('/teacher/schedule')"
              />
            </div>
          </template>
          <template #content>
            <div v-if="loading" class="text-center py-4">
              <ProgressSpinner style="width: 40px; height: 40px" />
            </div>
            <div v-else-if="weeklyClasses.length === 0" class="text-center py-8 text-gray-500">
              <i class="pi pi-calendar text-4xl mb-2"></i>
              <p>No classes scheduled this week</p>
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="classItem in weeklyClasses"
                :key="classItem.id"
                class="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer transition"
                @click="navigateTo(`/teacher/classes/${classItem.id}`)"
              >
                <div class="flex items-center gap-3">
                  <div class="text-center min-w-[50px]">
                    <div class="text-xs font-semibold text-gray-500">{{ getDayName(classItem.day_of_week) }}</div>
                    <div class="text-sm text-gray-700">{{ formatTime(classItem.start_time) }}</div>
                  </div>
                  <div
                    class="w-1 h-12 rounded-full"
                    :style="{ backgroundColor: classItem.dance_style_color || '#6B46C1' }"
                  ></div>
                  <div>
                    <div class="font-medium text-gray-900">{{ classItem.name }}</div>
                    <div class="text-sm text-gray-600">
                      {{ classItem.level_name }} • {{ classItem.dance_style_name }}
                    </div>
                  </div>
                </div>
                <Badge :value="classItem.student_count || 0" />
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Right Column - Quick Actions & Help -->
      <div class="space-y-6">
        <!-- Quick Actions -->
        <Card class="dashboard-card">
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-bolt text-primary"></i>
              <span>Quick Actions</span>
            </div>
          </template>
          <template #content>
            <div class="space-y-2">
              <Button
                label="My Classes"
                icon="pi pi-book"
                class="w-full p-button-outlined"
                @click="navigateTo('/teacher/classes')"
              />
              <Button
                label="View Schedule"
                icon="pi pi-calendar"
                class="w-full p-button-outlined"
                @click="navigateTo('/teacher/schedule')"
              />
              <Button
                label="Attendance History"
                icon="pi pi-check-square"
                class="w-full p-button-outlined"
                @click="navigateTo('/teacher/attendance')"
              />
              <Button
                label="Manage Availability"
                icon="pi pi-clock"
                class="w-full p-button-outlined"
                @click="navigateTo('/teacher/availability')"
              />
              <Button
                label="Student Rosters"
                icon="pi pi-users"
                class="w-full p-button-outlined"
                @click="navigateTo('/teacher/students')"
              />
            </div>
          </template>
        </Card>

        <!-- Availability Summary -->
        <Card class="dashboard-card">
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-clock text-primary"></i>
              <span>Availability</span>
            </div>
          </template>
          <template #content>
            <div v-if="loading" class="text-center py-4">
              <ProgressSpinner style="width: 30px; height: 30px" />
            </div>
            <div v-else-if="availabilitySlots.length === 0" class="text-center py-6 text-gray-500">
              <i class="pi pi-clock text-3xl mb-2"></i>
              <p class="text-sm mb-3">No availability set</p>
              <Button
                label="Set Availability"
                icon="pi pi-plus"
                class="p-button-sm"
                @click="navigateTo('/teacher/availability')"
              />
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="slot in availabilitySlots.slice(0, 5)"
                :key="slot.id"
                class="text-sm p-2 bg-green-50 border border-green-200 rounded"
              >
                <div class="font-medium text-green-800">{{ getDayName(slot.day_of_week) }}</div>
                <div class="text-green-600">
                  {{ formatTime(slot.start_time) }} - {{ formatTime(slot.end_time) }}
                </div>
              </div>
              <Button
                v-if="availabilitySlots.length > 5"
                label="View All"
                icon="pi pi-external-link"
                class="w-full p-button-text p-button-sm"
                @click="navigateTo('/teacher/availability')"
              />
            </div>
          </template>
        </Card>

        <!-- Help & Resources -->
        <Card class="dashboard-card">
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-question-circle text-primary"></i>
              <span>Help & Resources</span>
            </div>
          </template>
          <template #content>
            <div class="space-y-2">
              <Button
                label="Teacher Guide"
                icon="pi pi-book"
                class="w-full p-button-outlined p-button-sm"
                @click="openGuide"
              />
              <Button
                label="Contact Admin"
                icon="pi pi-envelope"
                class="w-full p-button-outlined p-button-sm"
                @click="contactAdmin"
              />
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'

const authStore = useAuthStore()
const toast = useToast()
const profile = computed(() => authStore.profile)

const loading = ref(true)
const showOnboarding = ref(false)

const stats = ref({
  totalClasses: 0,
  totalStudents: 0,
  classesToday: 0,
  classesThisWeek: 0
})

const todaysClasses = ref([])
const weeklyClasses = ref([])
const availabilitySlots = ref([])

onMounted(async () => {
  await loadDashboardData()
  checkOnboardingStatus()
})

async function loadDashboardData() {
  loading.value = true
  try {
    // Fetch teacher dashboard data
    const { data, error } = await useFetch('/api/teacher/dashboard')

    if (error.value) {
      throw new Error(error.value.message || 'Failed to load dashboard')
    }

    if (data.value) {
      stats.value = data.value.stats || stats.value
      todaysClasses.value = data.value.todaysClasses || []
      weeklyClasses.value = data.value.weeklyClasses || []
      availabilitySlots.value = data.value.availability || []
    }
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load dashboard data',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

function checkOnboardingStatus() {
  const hasCompletedOnboarding = localStorage.getItem('teacher_onboarding_completed')
  const accountAge = profile.value?.created_at ? new Date(profile.value.created_at) : null
  const isNewUser = accountAge && (new Date().getTime() - accountAge.getTime()) < 30 * 24 * 60 * 60 * 1000 // 30 days

  showOnboarding.value = !hasCompletedOnboarding && isNewUser
}

function handleOnboardingComplete() {
  showOnboarding.value = false
  localStorage.setItem('teacher_onboarding_completed', 'true')
}

function takeAttendance(classId: string) {
  navigateTo(`/teacher/attendance/class/${classId}`)
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[dayOfWeek] || ''
}

function formatTime(time: string) {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

function openGuide() {
  window.open('/docs/teacher-guide', '_blank')
}

function contactAdmin() {
  navigateTo('/contact')
}
</script>

<style scoped>
.teacher-dashboard {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-card :deep(.p-card-title) {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
}

.dashboard-card :deep(.p-card-content) {
  padding-top: 1rem;
}
</style>
