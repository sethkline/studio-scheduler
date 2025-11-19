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
          <NuxtLink to="/admin/dashboard" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/admin/dashboard') || isActive('/admin') }">
            <i class="pi pi-home mr-3"></i>
            <span>Dashboard</span>
          </NuxtLink>
        </div>

        <!-- Schedule Section -->
        <div class="space-y-2">
          <div class="sidebar-header">Schedule</div>

          <NuxtLink to="/admin/schedule" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/admin/schedule') }">
            <i class="pi pi-calendar mr-3"></i>
            <span>View Schedule</span>
          </NuxtLink>

          <template v-if="hasAdminAccess">
            <NuxtLink
              to="/admin/schedules"
              class="sidebar-link"
              :class="{ 'sidebar-link-active': isActive('/admin/schedules') && !isActive('/admin/schedules/*/builder') }"
            >
              <i class="pi pi-calendar-plus mr-3"></i>
              <span>Manage Terms</span>
            </NuxtLink>

            <NuxtLink
              v-if="activeScheduleId"
              :to="`/admin/schedules/${activeScheduleId}/builder`"
              class="sidebar-link"
              :class="{ 'sidebar-link-active': isActive('/admin/schedules/') && isActive('/builder') }"
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
            to="/admin/classes"
            class="sidebar-link"
            :class="{
              'sidebar-link-active':
                isActive('/admin/classes') && !isActive('/admin/classes/styles') && !isActive('/admin/classes/levels')
            }"
          >
            <i class="pi pi-th-large mr-3"></i>
            <span>Class Management</span>
          </NuxtLink>

          <template v-if="hasAdminAccess">
            <NuxtLink
              to="/admin/classes/styles"
              class="sidebar-link"
              :class="{ 'sidebar-link-active': isActive('/admin/classes/styles') }"
            >
              <i class="pi pi-palette mr-3"></i>
              <span>Dance Styles</span>
            </NuxtLink>

            <NuxtLink
              to="/admin/classes/levels"
              class="sidebar-link"
              :class="{ 'sidebar-link-active': isActive('/admin/classes/levels') }"
            >
              <i class="pi pi-chart-line mr-3"></i>
              <span>Class Levels</span>
            </NuxtLink>

            <NuxtLink
              to="/admin/classes/definitions"
              class="sidebar-link"
              :class="{ 'sidebar-link-active': isActive('/admin/classes/definitions') }"
            >
              <i class="pi pi-briefcase mr-3"></i>
              <span>Class Definitions</span>
            </NuxtLink>
          </template>
        </div>

        <!-- People Section -->
        <div class="space-y-2">
          <div class="sidebar-header">People</div>

          <NuxtLink to="/admin/students" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/admin/students') }">
            <i class="pi pi-users mr-3"></i>
            <span>Students</span>
          </NuxtLink>

          <NuxtLink to="/admin/teachers" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/admin/teachers') }">
            <i class="pi pi-user mr-3"></i>
            <span>Teachers</span>
          </NuxtLink>
        </div>

        <!-- Parent Section - Parent Only -->
        <div v-if="isParent" class="space-y-2">
          <div class="sidebar-header">My Family</div>

          <NuxtLink to="/parent/dashboard" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/parent/dashboard') }">
            <i class="pi pi-home mr-3"></i>
            <span>Parent Dashboard</span>
          </NuxtLink>

          <NuxtLink to="/parent/students" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/parent/students') }">
            <i class="pi pi-users mr-3"></i>
            <span>My Dancers</span>
          </NuxtLink>

          <NuxtLink to="/parent/schedule" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/parent/schedule') }">
            <i class="pi pi-calendar mr-3"></i>
            <span>Schedule</span>
          </NuxtLink>

          <NuxtLink to="/parent/payments" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/parent/payments') }">
            <i class="pi pi-dollar mr-3"></i>
            <span>Payments</span>
          </NuxtLink>

          <NuxtLink to="/parent/recitals" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/parent/recitals') }">
            <i class="pi pi-star mr-3"></i>
            <span>Recitals & Tickets</span>
          </NuxtLink>

          <NuxtLink to="/parent/costumes" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/parent/costumes') }">
            <i class="pi pi-shopping-bag mr-3"></i>
            <span>Costumes</span>
          </NuxtLink>

          <NuxtLink to="/parent/volunteers" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/parent/volunteers') }">
            <i class="pi pi-heart mr-3"></i>
            <span>Volunteer</span>
          </NuxtLink>

          <NuxtLink to="/parent/media" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/parent/media') }">
            <i class="pi pi-images mr-3"></i>
            <span>Media Gallery</span>
          </NuxtLink>
        </div>

        <!-- Events Section -->
        <div v-if="!isParent" class="space-y-2">
          <div class="sidebar-header">Events</div>

          <NuxtLink to="/admin/recitals" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/admin/recitals') }">
            <i class="pi pi-star mr-3"></i>
            <span>Recitals</span>
          </NuxtLink>

          <NuxtLink v-if="hasAdminAccess" to="/admin/media" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/admin/media') }">
            <i class="pi pi-images mr-3"></i>
            <span>Media Gallery</span>
          </NuxtLink>
        </div>

        <!-- Costumes Section - Staff/Admin Only -->
        <div v-if="hasAdminAccess" class="space-y-2">
          <div class="sidebar-header">Costumes</div>

          <NuxtLink to="/admin/costumes" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/admin/costumes') && !isActive('/admin/costumes/assignments') }">
            <i class="pi pi-shopping-bag mr-3"></i>
            <span>Inventory</span>
          </NuxtLink>

          <NuxtLink to="/admin/costumes/assignments" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/admin/costumes/assignments') }">
            <i class="pi pi-list mr-3"></i>
            <span>Assignments</span>
          </NuxtLink>
        </div>

        <!-- Studio Management Section - Admin Only -->
        <div v-if="hasAdminAccess" class="space-y-2">
          <div class="sidebar-header">Studio Setup</div>

          <NuxtLink
            to="/admin/studio/profile"
            class="sidebar-link"
            :class="{ 'sidebar-link-active': isActive('/admin/studio/profile') }"
          >
            <i class="pi pi-building mr-3"></i>
            <span>Studio Profile</span>
          </NuxtLink>

          <NuxtLink
            to="/admin/studio/locations"
            class="sidebar-link"
            :class="{ 'sidebar-link-active': isActive('/admin/studio/locations') }"
          >
            <i class="pi pi-map-marker mr-3"></i>
            <span>Locations & Rooms</span>
          </NuxtLink>

          <NuxtLink
            to="/admin/studio/constraints"
            class="sidebar-link"
            :class="{ 'sidebar-link-active': isActive('/admin/studio/constraints') }"
          >
            <i class="pi pi-sliders-h mr-3"></i>
            <span>Scheduling Rules</span>
          </NuxtLink>
        </div>

        <!-- Admin Section - Admin Only -->
        <div v-if="isAdmin" class="space-y-2">
          <div class="sidebar-header">Administration</div>

          <NuxtLink
            to="/admin/settings/users"
            class="sidebar-link"
            :class="{ 'sidebar-link-active': isActive('/admin/settings/users') }"
          >
            <i class="pi pi-users-cog mr-3"></i>
            <span>User Management</span>
          </NuxtLink>

          <NuxtLink
            to="/onboarding"
            class="sidebar-link"
            :class="{ 'sidebar-link-active': isActive('/onboarding') }"
          >
            <i class="pi pi-book mr-3"></i>
            <span>Studio Setup Wizard</span>
          </NuxtLink>

          <NuxtLink to="/admin/reports" class="sidebar-link" :class="{ 'sidebar-link-active': isActive('/admin/reports') }">
            <i class="pi pi-chart-bar mr-3"></i>
            <span>Reports</span>
          </NuxtLink>

          <NuxtLink
            to="/admin/settings"
            class="sidebar-link"
            :class="{ 'sidebar-link-active': isActive('/admin/settings') && !isActive('/admin/settings/users') }"
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
          <p v-if="userRoleDisplay" class="text-xs text-gray-500">{{ userRoleDisplay }}</p>
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
import { usePermissions } from '~/composables/usePermissions';

const user = useSupabaseUser();
const client = useSupabaseClient();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const scheduleTermStore = useScheduleTermStore();
const { can, isAdmin, hasAdminAccess, isParent, fullName, initials, userRole } = usePermissions();

// Emits
const emit = defineEmits(['close']);

// State
const activeScheduleId = ref<string | null>(null);

// Get user email
const userEmail = computed(() => {
  return user.value?.email || '';
});

// Get user initials for avatar (from permissions composable)
const userInitials = computed(() => initials.value);

// Get user role display name
const userRoleDisplay = computed(() => {
  const role = userRole.value;
  if (!role) return '';

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    staff: 'Staff Member',
    teacher: 'Teacher',
    parent: 'Parent/Guardian',
    student: 'Student',
  };

  return roleLabels[role] || role;
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
