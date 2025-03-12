<template>
  <header class="bg-primary-700 text-white shadow">
    <nav class="container mx-auto px-4 py-4 flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <NuxtLink to="/" class="text-2xl font-bold">Dance Studio</NuxtLink>
        
        <div class="hidden md:flex space-x-4">
          <NuxtLink to="/schedule" class="hover:text-primary-200">Schedule</NuxtLink>
          <NuxtLink to="/classes" class="hover:text-primary-200">Classes</NuxtLink>
          <NuxtLink to="/teachers" class="hover:text-primary-200">Teachers</NuxtLink>
          <NuxtLink to="/students" class="hover:text-primary-200">Students</NuxtLink>
          <NuxtLink to="/recitals" class="hover:text-primary-200">Recitals</NuxtLink>
        </div>
      </div>
      
      <div class="flex items-center space-x-4">
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
      </div>
    </nav>
  </header>
</template>

<script setup>
const user = useSupabaseUser();
const client = useSupabaseClient();
const menu = ref(null);

const handleLogout = async () => {
  await client.auth.signOut();
  navigateTo('/login');
};

const menuItems = ref([
  {
    label: 'Logout',
    icon: 'pi pi-sign-out',
    command: handleLogout
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