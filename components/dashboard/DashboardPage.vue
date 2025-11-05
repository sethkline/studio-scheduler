<template>
  <div class="space-y-6">
    <SeasonTransitionNotice
      v-if="showTransitionNotice"
      @dismiss="showTransitionNotice = false"
      @seasonCreated="handleSeasonCreated"
    />

    <div class="card">
      <h1 class="text-2xl font-bold text-primary-800 mb-4">Dance Studio Dashboard</h1>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-primary-50 rounded-lg p-6 shadow">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-primary-700">Total Classes</h3>
              <p class="text-3xl font-bold mt-2">{{ statistics.totalClasses || 0 }}</p>
            </div>
            <i class="pi pi-book text-4xl text-primary-300"></i>
          </div>
        </div>

        <div class="bg-secondary-50 rounded-lg p-6 shadow">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-secondary-700">Active Students</h3>
              <p class="text-3xl font-bold mt-2">{{ statistics.activeStudents || 0 }}</p>
            </div>
            <i class="pi pi-users text-4xl text-secondary-300"></i>
          </div>
        </div>

        <div class="bg-green-50 rounded-lg p-6 shadow">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-green-700">Teachers</h3>
              <p class="text-3xl font-bold mt-2">{{ statistics.teachers || 0 }}</p>
            </div>
            <i class="pi pi-user text-4xl text-green-300"></i>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Upcoming Classes</h2>
          <Button
            v-if="authStore.hasRole(['admin', 'staff'])"
            icon="pi pi-calendar"
            label="Schedule"
            class="p-button-sm"
            @click="goToSchedule"
          />
        </div>
        <div v-if="loading" class="flex justify-center">
          <i class="pi pi-spin pi-spinner text-2xl"></i>
        </div>
        <div v-else-if="upcomingClasses.length === 0" class="text-gray-500">No upcoming classes found.</div>
        <ul v-else class="divide-y">
          <li v-for="classItem in upcomingClasses" :key="classItem.id" class="py-3">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <span
                  :class="['badge', `badge-${classItem.dance_style?.toLowerCase() || 'default'}`]"
                  class="inline-block px-2 py-1 rounded-full text-xs"
                  :style="{ backgroundColor: classItem.color || '#cccccc', color: 'white' }"
                >
                  {{ classItem.dance_style }}
                </span>
              </div>
              <div class="ml-3 flex-grow">
                <p class="text-sm font-medium">{{ classItem.name }}</p>
                <p class="text-xs text-gray-500">
                  {{ formatTime(classItem.start_time) }} - {{ formatTime(classItem.end_time) }}
                </p>
              </div>
              <div class="text-xs text-gray-500">
                {{ getDayName(classItem.day_of_week) }}
              </div>
            </div>
          </li>
        </ul>
      </div>

      <div class="card">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Active Schedule</h2>
          <div v-if="activeSchedule">
            <Badge :value="activeSchedule.name" severity="success" />
          </div>
        </div>
        <div v-if="loading" class="flex justify-center">
          <i class="pi pi-spin pi-spinner text-2xl"></i>
        </div>
        <div v-else-if="!activeSchedule" class="text-gray-500 mb-4">No active schedule found.</div>
        <div v-else class="mb-4">
          <p class="text-sm text-gray-600">
            {{ formatDate(activeSchedule.start_date) }} - {{ formatDate(activeSchedule.end_date) }}
          </p>
          <p class="text-sm mt-2" v-if="activeSchedule.description">
            {{ activeSchedule.description }}
          </p>
        </div>

        <div class="mt-4">
          <h3 class="text-lg font-semibold mb-2">Recent Activity</h3>
          <p class="text-gray-500">Activity feed will appear here.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '~/stores/auth';
import { useScheduleTermStore } from '~/stores/useScheduleTermStore';
import SeasonTransitionNotice from '~/components/SeasonTransitionNotice.vue';
import type { Schedule } from '~/types';

// State
const user = useSupabaseUser();
const loading = ref(true);
const upcomingClasses = ref<any[]>([]);
const statistics = ref({
  totalClasses: 0,
  activeStudents: 0,
  teachers: 0
});
const showTransitionNotice = ref(true);
const activeSchedule = ref<Schedule | null>(null);

// Composables
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const scheduleStore = useScheduleTermStore();

// Redirect if not authenticated
if (!user.value) {
  router.push('/login');
}

// Using the API service composable
const { fetchDashboard } = useApiService();

onMounted(async () => {
  try {
    loading.value = true;

    // Load dashboard data
    await loadDashboardData();

    // Get active schedule
    await loadActiveSchedule();
  } catch (error: any) {
    console.error('Error loading dashboard:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load dashboard',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
});

async function loadDashboardData() {
  // Use the server API endpoint instead of direct Supabase calls
  const { data, error } = await fetchDashboard();

  if (error.value) {
    console.error('Error from API:', error.value);
    throw new Error('Failed to fetch dashboard data');
  }

  // Update component data with API response
  if (data.value) {
    upcomingClasses.value = data.value.upcomingClasses || [];
    statistics.value = data.value.statistics || {
      totalClasses: 0,
      activeStudents: 0,
      totalTeachers: 0,
    };
  }
}

async function loadActiveSchedule() {
  try {
    // Fetch active schedule
    const activeSchedules = await scheduleStore.fetchSchedules({ isActive: true });

    if (activeSchedules && activeSchedules.length > 0) {
      activeSchedule.value = activeSchedules[0];
    }
  } catch (error) {
    console.error('Error fetching active schedule:', error);
  }
}

// Handle season created event
function handleSeasonCreated(newSeason: Schedule) {
  toast.add({
    severity: 'info',
    summary: 'New Season Created',
    detail: `${newSeason.name} has been set up successfully`,
    life: 3000
  });

  // Hide the notice
  showTransitionNotice.value = false;

  // Refresh dashboard data
  loadDashboardData();
  loadActiveSchedule();
}

// Navigate to schedule builder
function goToSchedule() {
  if (activeSchedule.value) {
    router.push(`/schedules/${activeSchedule.value.id}/builder`);
  } else {
    router.push('/schedules');
  }
}

// Format a time string for display
function formatTime(timeString: string): string {
  if (!timeString) return '';
  const date = new Date(`2000-01-01T${timeString}`);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Format a date for display
function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

// Get day name from day of week number
function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || '';
}
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}
</style>
