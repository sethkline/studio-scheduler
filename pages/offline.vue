<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="max-w-md w-full text-center">
      <!-- Offline Icon -->
      <div class="mb-8">
        <div class="mx-auto w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center">
          <i class="pi pi-wifi-slash text-5xl text-yellow-600"></i>
        </div>
      </div>

      <!-- Heading -->
      <h1 class="text-3xl font-bold text-gray-900 mb-4">
        You're Offline
      </h1>

      <!-- Description -->
      <p class="text-lg text-gray-600 mb-8">
        It looks like you've lost your internet connection. Some features may not be available right now.
      </p>

      <!-- Features Available Offline -->
      <div class="bg-white rounded-lg shadow-sm p-6 mb-8 text-left">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <i class="pi pi-check-circle text-green-600 mr-2"></i>
          Available Offline
        </h2>
        <ul class="space-y-2 text-gray-600">
          <li class="flex items-start">
            <i class="pi pi-check text-green-600 mr-2 mt-1 text-sm"></i>
            <span>View previously loaded schedules</span>
          </li>
          <li class="flex items-start">
            <i class="pi pi-check text-green-600 mr-2 mt-1 text-sm"></i>
            <span>Access cached student profiles</span>
          </li>
          <li class="flex items-start">
            <i class="pi pi-check text-green-600 mr-2 mt-1 text-sm"></i>
            <span>View class information</span>
          </li>
          <li class="flex items-start">
            <i class="pi pi-check text-green-600 mr-2 mt-1 text-sm"></i>
            <span>Browse your data</span>
          </li>
        </ul>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-3">
        <Button
          @click="retry"
          severity="primary"
          class="w-full"
          size="large"
        >
          <i class="pi pi-refresh mr-2"></i>
          Try Again
        </Button>

        <Button
          @click="goToDashboard"
          severity="secondary"
          outlined
          class="w-full"
          size="large"
        >
          <i class="pi pi-home mr-2"></i>
          Go to Dashboard
        </Button>
      </div>

      <!-- Connection Status -->
      <div class="mt-8 p-4 bg-blue-50 rounded-lg">
        <p class="text-sm text-blue-800">
          <i class="pi pi-info-circle mr-2"></i>
          Your changes will be saved and synced automatically when you're back online.
        </p>
      </div>

      <!-- Tips -->
      <div class="mt-6 text-sm text-gray-500">
        <p class="mb-2">Troubleshooting tips:</p>
        <ul class="text-left space-y-1 ml-6">
          <li>• Check your Wi-Fi or mobile data connection</li>
          <li>• Try switching to a different network</li>
          <li>• Restart your router if using Wi-Fi</li>
          <li>• Contact your service provider if the issue persists</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import Button from 'primevue/button';

const router = useRouter();

// Define page metadata
definePageMeta({
  layout: false,
});

// Set page title
useHead({
  title: 'Offline - Dance Studio Scheduler',
});

const retry = () => {
  window.location.reload();
};

const goToDashboard = () => {
  router.push('/');
};

// Check online status and redirect when online
onMounted(() => {
  const checkOnline = () => {
    if (navigator.onLine) {
      // Attempt to fetch a small resource to verify connectivity
      fetch('/favicon.ico', { cache: 'no-store' })
        .then(() => {
          // Successfully online, redirect to previous page or home
          const referrer = document.referrer;
          if (referrer && new URL(referrer).origin === window.location.origin) {
            window.history.back();
          } else {
            router.push('/');
          }
        })
        .catch(() => {
          // Still offline
        });
    }
  };

  // Check every 5 seconds
  const interval = setInterval(checkOnline, 5000);

  // Listen for online event
  window.addEventListener('online', checkOnline);

  onUnmounted(() => {
    clearInterval(interval);
    window.removeEventListener('online', checkOnline);
  });
});
</script>

<style scoped>
/* Animation for the offline icon */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.pi-wifi-slash {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
