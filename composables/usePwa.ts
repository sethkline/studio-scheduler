import { ref, onMounted, onUnmounted } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePwa() {
  const canInstall = ref(false);
  const isInstalled = ref(false);
  const installPromptEvent = ref<BeforeInstallPromptEvent | null>(null);
  const showInstallPrompt = ref(false);

  // Handle service worker updates
  const {
    needRefresh,
    offlineReady,
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, r) {
      console.log(`Service Worker registered: ${swUrl}`);
      // Check for updates periodically (every hour)
      r && setInterval(() => {
        r.update();
      }, 60 * 60 * 1000);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    installPromptEvent.value = e as BeforeInstallPromptEvent;
    canInstall.value = true;

    // Show install prompt after user has been on the site for 30 seconds
    setTimeout(() => {
      if (canInstall.value && !isInstalled.value) {
        showInstallPrompt.value = true;
      }
    }, 30000);
  };

  const handleAppInstalled = () => {
    canInstall.value = false;
    isInstalled.value = true;
    showInstallPrompt.value = false;
    installPromptEvent.value = null;
  };

  const install = async () => {
    if (!installPromptEvent.value) {
      return false;
    }

    try {
      await installPromptEvent.value.prompt();
      const { outcome } = await installPromptEvent.value.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        return true;
      } else {
        console.log('User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('Error during installation:', error);
      return false;
    }
  };

  const dismissInstallPrompt = () => {
    showInstallPrompt.value = false;
    // Don't show again for 7 days
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const shouldShowInstallPrompt = () => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (!dismissed) return true;

    const dismissedTime = parseInt(dismissed);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    return Date.now() - dismissedTime > sevenDays;
  };

  onMounted(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isInstalled.value = true;
      canInstall.value = false;
    }

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Only show prompt if not dismissed recently
    if (!shouldShowInstallPrompt()) {
      showInstallPrompt.value = false;
    }
  });

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  });

  return {
    canInstall,
    isInstalled,
    showInstallPrompt,
    install,
    dismissInstallPrompt,
    // Service worker update related
    needRefresh,
    offlineReady,
    updateServiceWorker,
  };
}
