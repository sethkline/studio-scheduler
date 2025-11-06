<template>
  <div
    v-if="needRefresh"
    class="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 bg-purple-600 text-white rounded-lg shadow-2xl p-4 animate-slide-down"
  >
    <div class="flex items-start gap-3">
      <!-- Update Icon -->
      <div class="flex-shrink-0 mt-0.5">
        <i class="pi pi-sync text-2xl"></i>
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-semibold mb-1">
          Update Available
        </h3>
        <p class="text-sm text-purple-100 mb-3">
          A new version of the app is available. Reload to get the latest features and improvements.
        </p>

        <!-- Actions -->
        <div class="flex gap-2">
          <Button
            @click="handleUpdate"
            severity="contrast"
            size="small"
            class="bg-white text-purple-600 hover:bg-purple-50"
          >
            <i class="pi pi-refresh mr-2"></i>
            Update Now
          </Button>
          <Button
            @click="handleDismiss"
            text
            size="small"
            class="text-white hover:bg-purple-500"
          >
            Later
          </Button>
        </div>
      </div>

      <!-- Close button -->
      <button
        @click="handleDismiss"
        class="flex-shrink-0 text-purple-200 hover:text-white"
        aria-label="Close"
      >
        <i class="pi pi-times"></i>
      </button>
    </div>
  </div>

  <!-- Offline Ready Notification -->
  <div
    v-if="offlineReady && !offlineReadyDismissed"
    class="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 bg-green-600 text-white rounded-lg shadow-2xl p-4 animate-slide-down"
  >
    <div class="flex items-start gap-3">
      <!-- Check Icon -->
      <div class="flex-shrink-0 mt-0.5">
        <i class="pi pi-check-circle text-2xl"></i>
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-semibold mb-1">
          App Ready for Offline Use
        </h3>
        <p class="text-sm text-green-100">
          The app is now cached and ready to work offline.
        </p>
      </div>

      <!-- Close button -->
      <button
        @click="offlineReadyDismissed = true"
        class="flex-shrink-0 text-green-200 hover:text-white"
        aria-label="Close"
      >
        <i class="pi pi-times"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePwa } from '~/composables/usePwa';
import Button from 'primevue/button';

const { needRefresh, offlineReady, updateServiceWorker } = usePwa();
const offlineReadyDismissed = ref(false);
const updateDismissed = ref(false);

const handleUpdate = async () => {
  await updateServiceWorker();
};

const handleDismiss = () => {
  updateDismissed.value = true;
  needRefresh.value = false;
};
</script>

<style scoped>
@keyframes slide-down {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-down {
  animation: slide-down 0.3s ease-out;
}
</style>
