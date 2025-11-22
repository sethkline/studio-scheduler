<template>
  <div class="admin-dashboard">
    <!-- Welcome Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Welcome back{{ profile?.first_name ? `, ${profile.first_name}` : '' }}!
      </h1>
      <p class="text-gray-600">Here's what's happening at {{ studio?.name || 'your studio' }}</p>
    </div>

    <!-- Onboarding Checklist (shown for new users) -->
    <AdminOnboardingChecklist v-if="showOnboarding" class="mb-8" @complete="handleOnboardingComplete" />

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <DashboardStatCard
        title="Active Classes"
        :value="stats.activeClasses"
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
        title="Upcoming Shows"
        :value="stats.upcomingShows"
        icon="pi-calendar"
        color="purple"
        :loading="loading"
      />
      <DashboardStatCard
        title="Tickets Sold"
        :value="stats.ticketsSold"
        icon="pi-ticket"
        color="orange"
        :loading="loading"
      />
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column - Quick Actions & Upcoming Events -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Quick Actions -->
        <Card class="dashboard-card">
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-bolt text-primary"></i>
              <span>Quick Actions</span>
            </div>
          </template>
          <template #content>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button
                label="New Class"
                icon="pi pi-plus"
                @click="navigateTo('/admin/classes/new')"
                class="p-button-outlined"
              />
              <Button
                label="Add Student"
                icon="pi pi-user-plus"
                @click="navigateTo('/admin/students/new')"
                class="p-button-outlined"
              />
              <Button
                label="Create Recital"
                icon="pi pi-star"
                @click="navigateTo('/admin/recitals/new')"
                class="p-button-outlined"
              />
              <Button
                label="View Schedule"
                icon="pi pi-calendar"
                @click="navigateTo('/admin/schedule')"
                class="p-button-outlined"
              />
              <Button
                label="Manage Teachers"
                icon="pi pi-id-card"
                @click="navigateTo('/admin/teachers')"
                class="p-button-outlined"
              />
              <Button
                label="Ticketing"
                icon="pi pi-ticket"
                @click="navigateTo('/admin/ticketing/dashboard')"
                class="p-button-outlined"
              />
            </div>
          </template>
        </Card>

        <!-- Upcoming Events -->
        <Card class="dashboard-card">
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-calendar-plus text-primary"></i>
              <span>Upcoming Shows</span>
            </div>
          </template>
          <template #content>
            <div v-if="loading" class="text-center py-4">
              <ProgressSpinner style="width: 40px; height: 40px" />
            </div>
            <div v-else-if="upcomingShows.length === 0" class="text-center py-8 text-gray-500">
              <i class="pi pi-calendar text-4xl mb-2"></i>
              <p>No upcoming shows scheduled</p>
              <Button
                label="Create Recital"
                icon="pi pi-plus"
                class="mt-4 p-button-sm"
                @click="navigateTo('/admin/recitals/new')"
              />
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="show in upcomingShows"
                :key="show.id"
                class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                @click="navigateTo(`/admin/recitals/shows/${show.id}`)"
              >
                <div class="flex-1">
                  <div class="font-semibold text-gray-900">{{ show.name }}</div>
                  <div class="text-sm text-gray-600">
                    {{ formatDate(show.date) }} at {{ formatTime(show.start_time) }}
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ show.location || 'Location TBD' }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-medium text-primary">
                    {{ show.ticket_count || 0 }} tickets sold
                  </div>
                  <Badge :value="show.status" :severity="getStatusSeverity(show.status)" />
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Right Column - Recent Activity & Tasks -->
      <div class="space-y-6">
        <!-- Recent Orders -->
        <Card class="dashboard-card">
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-shopping-cart text-primary"></i>
              <span>Recent Orders</span>
            </div>
          </template>
          <template #content>
            <div v-if="loading" class="text-center py-4">
              <ProgressSpinner style="width: 30px; height: 30px" />
            </div>
            <div v-else-if="recentOrders.length === 0" class="text-center py-6 text-gray-500">
              <i class="pi pi-inbox text-3xl mb-2"></i>
              <p class="text-sm">No recent orders</p>
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="order in recentOrders"
                :key="order.id"
                class="p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer transition"
                @click="navigateTo(`/admin/ticketing/orders/${order.id}`)"
              >
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="font-medium text-sm">{{ order.customer_email }}</div>
                    <div class="text-xs text-gray-600">{{ order.ticket_count }} tickets</div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-semibold text-green-600">
                      ${{ (order.total_amount_cents / 100).toFixed(2) }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ formatRelativeTime(order.created_at) }}
                    </div>
                  </div>
                </div>
              </div>
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
                label="Start Guided Tour"
                icon="pi pi-compass"
                class="w-full p-button-outlined p-button-sm"
                @click="startTour"
              />
              <Button
                label="Video Tutorials"
                icon="pi pi-play-circle"
                class="w-full p-button-outlined p-button-sm"
                @click="openTutorials"
              />
              <Button
                label="Contact Support"
                icon="pi pi-envelope"
                class="w-full p-button-outlined p-button-sm"
                @click="contactSupport"
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
import { useStudioStore } from '@/stores/studio'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

definePageMeta({
  middleware: ['auth', 'admin']
})

const authStore = useAuthStore()
const studioStore = useStudioStore()
const profile = computed(() => authStore.profile)
const studio = computed(() => studioStore.studio)

const loading = ref(true)
const showOnboarding = ref(false)

const stats = ref({
  activeClasses: 0,
  totalStudents: 0,
  upcomingShows: 0,
  ticketsSold: 0
})

const upcomingShows = ref([])
const recentOrders = ref([])

onMounted(async () => {
  await loadDashboardData()
  checkOnboardingStatus()
})

async function loadDashboardData() {
  loading.value = true
  try {
    // Fetch dashboard stats and data
    const [classesRes, showsRes, ordersRes] = await Promise.all([
      $fetch('/api/class-instances/count'),
      $fetch('/api/recital-shows/upcoming'),
      $fetch('/api/ticket-orders/recent', { params: { limit: 5 } })
    ])

    stats.value.activeClasses = classesRes.count || 0
    stats.value.upcomingShows = showsRes.length || 0
    upcomingShows.value = showsRes.slice(0, 5) || []
    recentOrders.value = ordersRes || []

    // Calculate total tickets sold
    stats.value.ticketsSold = ordersRes.reduce((sum: number, order: any) => sum + (order.ticket_count || 0), 0)
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  } finally {
    loading.value = false
  }
}

function checkOnboardingStatus() {
  // Show onboarding checklist if profile is incomplete or user is new
  const hasCompletedOnboarding = localStorage.getItem('onboarding_completed')
  const accountAge = profile.value?.created_at ? new Date(profile.value.created_at) : null
  const isNewUser = accountAge && (new Date().getTime() - accountAge.getTime()) < 7 * 24 * 60 * 60 * 1000 // 7 days

  showOnboarding.value = !hasCompletedOnboarding && isNewUser
}

function handleOnboardingComplete() {
  showOnboarding.value = false
  localStorage.setItem('onboarding_completed', 'true')
}

function startTour() {
  const driverObj = driver({
    showProgress: true,
    steps: [
      {
        element: '.admin-dashboard',
        popover: {
          title: 'Welcome to Your Dashboard',
          description: 'This is your command center for managing your dance studio. Let\'s take a quick tour!',
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '.dashboard-card:first-of-type',
        popover: {
          title: 'Quick Actions',
          description: 'Use these buttons to quickly create classes, add students, and manage your studio.',
          side: 'right'
        }
      },
      {
        element: 'aside',
        popover: {
          title: 'Navigation Menu',
          description: 'Access all features of your studio from this sidebar. Click any item to explore!',
          side: 'right'
        }
      }
    ]
  })

  driverObj.drive()
}

function openTutorials() {
  // Link to video tutorials or help center
  window.open('https://help.yourapp.com/tutorials', '_blank')
}

function contactSupport() {
  navigateTo('/contact')
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatTime(time: string) {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

function formatRelativeTime(date: string) {
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

function getStatusSeverity(status: string) {
  const severityMap: Record<string, string> = {
    planning: 'info',
    active: 'success',
    published: 'success',
    completed: 'secondary',
    cancelled: 'danger'
  }
  return severityMap[status] || 'info'
}
</script>

<style scoped>
.admin-dashboard {
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
