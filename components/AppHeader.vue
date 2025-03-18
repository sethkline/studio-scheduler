<template>
  <header class="bg-primary-700 text-white shadow">
    <div class="container mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center">
        <NuxtLink to="/" class="text-2xl font-bold">Dance Studio</NuxtLink>
      </div>
      
      <div class="flex items-center space-x-4">
        <!-- User profile/account dropdown -->
        <div v-if="user">
          <Menu ref="menu" :model="menuItems" :popup="true">
            <template #button>
              <Button
                type="button"
                class="p-button-text p-button-rounded p-button-plain text-white"
                @click="(event) => menu.toggle(event)"
              >
                <span class="mr-2">{{ user.email }}</span>
                <i class="pi pi-angle-down"></i>
              </Button>
            </template>
          </Menu>
        </div>
        <NuxtLink v-else to="/login" class="hover:text-primary-200">Login</NuxtLink>
        
        <!-- Mobile menu toggle button - only visible on mobile -->
        <button @click="toggleSidebar" class="md:hidden text-white">
          <i class="pi pi-bars text-xl"></i>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
const user = useSupabaseUser();
const client = useSupabaseClient();
const menu = ref(null);
const studioMenu = ref(null);
const sidebarOpen = ref(false);
const emits = defineEmits(['toggle-sidebar']);

const handleLogout = async () => {
  await client.auth.signOut();
  navigateTo('/login');
};

const toggleStudioMenu = (event) => {
  studioMenu.value.toggle(event);
};

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
  emits('toggle-sidebar', sidebarOpen.value);
};

const menuItems = ref([
  {
    label: 'Logout',
    icon: 'pi pi-sign-out',
    command: handleLogout
  }
]);

// Studio management menu items
const studioMenuItems = ref([
  {
    label: 'Studio Profile',
    icon: 'pi pi-building',
    to: '/studio/profile'
  },
  {
    label: 'Locations & Rooms',
    icon: 'pi pi-map-marker',
    to: '/studio/locations'
  },
  {
    label: 'Scheduling Rules',
    icon: 'pi pi-sliders-h',
    to: '/studio/constraints'
  }
]);
</script>

<style scoped>
/* Override PrimeVue button styles to match your theme */
:deep(.p-button.p-button-text.p-button-plain) {
  color: white;
}

:deep(.p-button.p-button-text.p-button-plain:hover) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--primary-200);
}

:deep(.p-menu) {
  min-width: 12rem;
}
</style>