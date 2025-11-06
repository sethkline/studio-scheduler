<template>
  <div
    v-if="showInstallPrompt && !isInstalled"
    class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 animate-slide-up"
  >
    <div class="flex items-start gap-3">
      <!-- App Icon -->
      <div class="flex-shrink-0">
        <img
          src="/icons/icon-96x96.png"
          alt="App Icon"
          class="w-12 h-12 rounded-lg"
        />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Install Dance Studio App
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
          Install our app for quick access, offline support, and a better experience.
        </p>

        <!-- Actions -->
        <div class="flex gap-2">
          <Button
            @click="handleInstall"
            severity="primary"
            size="small"
            class="flex-1"
          >
            <i class="pi pi-download mr-2"></i>
            Install
          </Button>
          <Button
            @click="handleDismiss"
            severity="secondary"
            outlined
            size="small"
          >
            Not Now
          </Button>
        </div>
      </div>

      <!-- Close button -->
      <button
        @click="handleDismiss"
        class="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="Close"
      >
        <i class="pi pi-times"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePwa } from '~/composables/usePwa';
import Button from 'primevue/button';

const { showInstallPrompt, isInstalled, install, dismissInstallPrompt } = usePwa();

const handleInstall = async () => {
  const installed = await install();
  if (installed) {
    showInstallPrompt.value = false;
  }
};

const handleDismiss = () => {
  dismissInstallPrompt();
};
</script>

<style scoped>
@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
</style>
