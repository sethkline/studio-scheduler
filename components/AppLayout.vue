<template>
  <div class="min-h-screen flex flex-col">
    <!-- PWA Components -->
    <OfflineIndicator />
    <PwaUpdatePrompt />
    <PwaInstallPrompt />

    <!-- Header -->
    <AppHeader @toggle-sidebar="toggleSidebar" />

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar - Visible on desktop, conditionally visible on mobile -->
      <div
        :class="{
          'fixed inset-0 z-40 md:relative md:z-0': true,
          'translate-x-0': sidebarOpen,
          '-translate-x-full md:translate-x-0': !sidebarOpen
        }"
        class="transition-transform duration-300 ease-in-out w-64 md:w-64 md:flex-shrink-0"
      >
        <!-- Backdrop for mobile -->
        <div
          v-if="sidebarOpen"
          class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          @click="sidebarOpen = false"
        ></div>
        
        <!-- Actual sidebar -->
        <div class="h-full relative z-50 md:z-0">
          <AppSidebar @close="sidebarOpen = false" />
        </div>
      </div>
      
      <!-- Main Content -->
      <main class="flex-1 overflow-auto p-4 md:p-6 bg-gray-50">
        <slot></slot>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Sidebar state
const sidebarOpen = ref(false);

// Toggle sidebar on mobile
const toggleSidebar = (value) => {
  sidebarOpen.value = typeof value === 'boolean' ? value : !sidebarOpen.value;
};
</script>