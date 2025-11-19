<template>
  <!-- Offline Banner -->
  <Transition name="slide-down">
    <div
      v-if="isOffline"
      class="fixed top-0 left-0 right-0 z-40 bg-yellow-500 text-white px-4 py-2 shadow-lg"
    >
      <div class="container mx-auto flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="pi pi-wifi-slash text-lg"></i>
          <span class="text-sm font-medium">
            You are offline
          </span>
          <span v-if="queuedActionCount > 0" class="text-xs opacity-90">
            ({{ queuedActionCount }} pending {{ queuedActionCount === 1 ? 'action' : 'actions' }})
          </span>
        </div>
        <div class="text-xs opacity-90">
          Changes will sync when you're back online
        </div>
      </div>
    </div>
  </Transition>

  <!-- Syncing Indicator -->
  <Transition name="fade">
    <div
      v-if="isOnline && syncInProgress"
      class="fixed top-0 left-0 right-0 z-40 bg-blue-500 text-white px-4 py-2 shadow-lg"
    >
      <div class="container mx-auto flex items-center justify-center gap-2">
        <i class="pi pi-spin pi-spinner text-lg"></i>
        <span class="text-sm font-medium">
          Syncing changes...
        </span>
      </div>
    </div>
  </Transition>

  <!-- Connection Restored -->
  <Transition name="fade">
    <div
      v-if="showConnectionRestored"
      class="fixed top-0 left-0 right-0 z-40 bg-green-500 text-white px-4 py-2 shadow-lg"
    >
      <div class="container mx-auto flex items-center justify-center gap-2">
        <i class="pi pi-check-circle text-lg"></i>
        <span class="text-sm font-medium">
          Connection restored
        </span>
      </div>
    </div>
  </Transition>

  <!-- Offline Badge (compact, for authenticated pages) -->
  <div
    v-if="isOffline && compact"
    class="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full"
  >
    <i class="pi pi-wifi-slash text-xs"></i>
    <span>Offline</span>
    <Badge
      v-if="queuedActionCount > 0"
      :value="queuedActionCount"
      severity="warning"
      size="small"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useOffline } from '~/composables/useOffline';
import Badge from 'primevue/badge';

interface Props {
  compact?: boolean;
}

defineProps<Props>();

const { isOnline, isOffline, queuedActionCount, syncInProgress } = useOffline();
const showConnectionRestored = ref(false);

// Watch for connection restoration
watch(isOnline, (online, wasOnline) => {
  if (online && wasOnline === false) {
    showConnectionRestored.value = true;

    // Hide after 3 seconds
    setTimeout(() => {
      showConnectionRestored.value = false;
    }, 3000);
  }
});
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
