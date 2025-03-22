<template>
  <div class="h-full flex flex-col bg-white shadow-lg border-r">
    <!-- Sidebar Header -->
    <div class="p-4 border-b flex items-center justify-between">
      <h2 class="text-xl font-bold text-primary-800">Dance Studio</h2>
      <button @click="$emit('close')" class="md:hidden text-gray-500 hover:text-gray-700">
        <i class="pi pi-times"></i>
      </button>
    </div>

    <!-- Sidebar Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <nav class="space-y-6">
        <!-- Dashboard -->
        <div>
          <NuxtLink to="/" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/') }">
            <i class="pi pi-home mr-3"></i>
            <span>Dashboard</span>
          </NuxtLink>
        </div>

        <!-- Schedule Section -->
        <div class="space-y-2">
          <div class="sidebar-header">Schedule</div>

          <NuxtLink to="/schedule" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/schedule') }">
            <i class="pi pi-calendar mr-3"></i>
            <span>View Schedule</span>
          </NuxtLink>

          <template v-if="hasAdminAccess">
            <NuxtLink
              to="/schedules"
              class="sidebar-link"
              :class="{ 'sidebar-link-active': isActive('/schedules') && !isActive('/schedules/*/builder') }"
            >
              <i class="pi pi-calendar-plus mr-3"></i>
              <span>Manage Terms</span>
            </NuxtLink>

            <NuxtLink
              v-if="activeScheduleId"
              :to="`/schedules/${activeScheduleId}/builder`"
              class="sidebar-link"
              :class="{ 'sidebar-link-active': isActive('/schedules/') && isActive('/builder') }"
            >
              <i class="pi pi-pencil mr-3"></i>
              <span>Schedule Builder</span>
            </NuxtLink>
          </template>
        </div>

        <!-- Classes Section -->
        <div class="space-y-2">
          <div class="sidebar-header">Classes</div>

          <NuxtLink
            to="/classes"
            class="sidebar-link"
            :class="{
              'sidebar-link-active':
                isActive('/classes') && !isActive('/classes/styles') && !isActive('/classes/levels')
            }"
          >
            <i class="pi pi-th-large mr-3"></i>
            <span>Class Management</span>
          </NuxtLink>

          <template v-if="hasAdminAccess">
            <NuxtLink
              to="/classes/styles"
              class="sidebar-link"
              :class="{ 'sidebar-link-active': isActive('/classes/styles') }"
            >
              <i class="pi pi-palette mr-3"></i>
              <span>Dance Styles</span>
            </NuxtLink>

            <NuxtLink
              to="/classes/levels"
              class="sidebar-link"
              :class="{ 'sidebar-link-active': isActive('/classes/levels') }"
            >
              <i class="pi pi-chart-line mr-3"></i>
              <span>Class Levels</span>
            </NuxtLink>

            <NuxtLink
              to="/classes/definitions"
              class="sidebar-link"
              :class="{ 'sidebar-link-active': isActive('/classes/levels') }"
            >
              <i class="pi pi-briefcase mr-3"></i>
              <span>Class Definitions</span>
            </NuxtLink>
          </template>
        </div>

        <!-- People Section -->
        <div class="space-y-2">
          <div class="sidebar-header">People</div>

          <NuxtLink to="/students" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/students') }">
            <i class="pi pi-users mr-3"></i>
            <span>Students</span>
          </NuxtLink>

          <NuxtLink to="/teachers" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/teachers') }">
            <i class="pi pi-user mr-3"></i>
            <span>Teachers</span>
          </NuxtLink>
        </div>

        <!-- Events Section -->
        <div class="space-y-2">
          <div class="sidebar-header">Events</div>

          <NuxtLink to="/recitals" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/recitals') }">
            <i class="pi pi-star mr-3"></i>
            <span>Recitals</span>
          </NuxtLink>
        </div>

        <!-- Studio Management Section - Admin Only -->
        <div v-if="hasAdminAccess" class="space-y-2">
          <div class="sidebar-header">Studio Setup</div>

          <NuxtLink
            to="/studio/profile"
            class="sidebar-link"
            :class="{ 'sidebar-link-active': isActive('/studio/profile') }"
          >
            <i class="pi pi-building mr-3"></i>
            <span>Studio Profile</span>
          </NuxtLink>

          <NuxtLink
            to="/studio/locations"
            class="sidebar-link"
            :class="{ 'sidebar-link-active': isActive('/studio/locations') }"
          >
            <i class="pi pi-map-marker mr-3"></i>
            <span>Locations & Rooms</span>
          </NuxtLink>

          <NuxtLink
            to="/studio/constraints"
            class="sidebar-link"
            :class="{ 'sidebar-link-active': isActive('/studio/constraints') }"
          >
            <i class="pi pi-sliders-h mr-3"></i>
            <span>Scheduling Rules</span>
          </NuxtLink>
        </div>

        <!-- Admin Section - Admin Only -->
        <div v-if="isAdmin" class="space-y-2">
          <div class="sidebar-header">Administration</div>

          <NuxtLink
            to="/settings/users"
            class="sidebar-link"
            :class="{ 'sidebar-link-active': isActive('/settings/users') }"
          >
            <i class="pi pi-users-cog mr-3"></i>
            <span>User Management</span>
          </NuxtLink>

          <NuxtLink to="/reports" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/reports') }">
            <i class="pi pi-chart-bar mr-3"></i>
            <span>Reports</span>
          </NuxtLink>

          <NuxtLink
            to="/settings"
            class="sidebar-link"
            :class="{ 'sidebar-link-active': isActive('/settings') && !isActive('/settings/users') }"
          >
            <i class="pi pi-cog mr-3"></i>
            <span>Settings</span>
          </NuxtLink>
        </div>
      </nav>
    </div>

    <!-- Sidebar Footer - User Info -->
    <div v-if="user" class="border-t p-4">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center">
            {{ userInitials }}
          </div>
        </div>
        <div class="ml-3">
          <NuxtLink to="/profile" class="text-sm font-medium hover:text-primary-700">{{ userEmail }}</NuxtLink>
          <p v-if="userRole" class="text-xs text-gray-500">{{ userRole }}</p>
          <button @click="handleLogout" class="text-xs text-gray-500 hover:text-primary-700 flex items-center mt-1">
            <i class="pi pi-sign-out mr-1"></i> Logout
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '~/stores/auth';
import { useScheduleTermStore } from '~/stores/useScheduleTermStore';

const user = useSupabaseUser();
const client = useSupabaseClient();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const scheduleTermStore = useScheduleTermStore();

// Emits
const emit = defineEmits(['close']);

// State
const activeScheduleId = ref<string | null>(null);

// Get user email and initials for avatar
const userEmail = computed(() => {
  return user.value?.email || '';
});

const userInitials = computed(() => {
  if (!user.value?.email) return '';
  return user.value.email.charAt(0).toUpperCase();
});

// Get user role for display
const userRole = computed(() => {
  if (!authStore.userProfile) return '';

  const role = authStore.userProfile.user_role;
  if (role === 'admin') return 'Administrator';
  if (role === 'staff') return 'Staff Member';
  if (role === 'teacher') return 'Teacher';
  return role;
});

// Access control helpers
const isAdmin = computed(() => {
  // return authStore.isAdmin
  // TODO update this when we add more roles
  return true;
});

const hasAdminAccess = computed(() => {
  // return authStore.hasRole(['admin', 'staff'])
  // TODO update this when we add more roles
  return true;
});

// Check if a route is active
const isActive = (path: string): boolean => {
  if (path === '/') {
    return route.path === '/';
  }
  return route.path.startsWith(path);
};

// Logout handler
const handleLogout = async () => {
  await client.auth.signOut();
  router.push('/login');
};

// Load active schedule on mount
onMounted(async () => {
  try {
    // Fetch active schedule for the builder link
    const activeSchedules = await scheduleTermStore.fetchSchedules({ isActive: true });

    if (activeSchedules && activeSchedules.length > 0) {
      activeScheduleId.value = activeSchedules[0].id;
    }
  } catch (error) {
    console.error('Error fetching active schedule:', error);
  }
});
</script>

<style scoped>
.sidebar-link {
  @apply flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 hover:text-primary-700 transition-colors duration-150;
}

.sidebar-link-active {
  @apply bg-primary-50 text-primary-700 font-medium;
}

.sidebar-header {
  @apply px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider;
}
</style>
