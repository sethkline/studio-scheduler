import { ref, computed } from 'vue';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotifications() {
  const isSupported = ref(false);
  const isSubscribed = ref(false);
  const subscription = ref<PushSubscription | null>(null);
  const permission = ref<NotificationPermission>('default');
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Check if push notifications are supported
  const checkSupport = () => {
    isSupported.value =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    if (isSupported.value) {
      permission.value = Notification.permission;
    }

    return isSupported.value;
  };

  // Request notification permission
  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported.value) {
      error.value = 'Push notifications are not supported in this browser';
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      permission.value = result;

      if (result === 'granted') {
        return true;
      } else if (result === 'denied') {
        error.value = 'Notification permission was denied';
        return false;
      } else {
        error.value = 'Notification permission was dismissed';
        return false;
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      error.value = 'Failed to request notification permission';
      return false;
    }
  };

  // Subscribe to push notifications
  const subscribe = async (): Promise<boolean> => {
    if (!isSupported.value) {
      error.value = 'Push notifications are not supported';
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      // Request permission if not granted
      if (permission.value !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          loading.value = false;
          return false;
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        subscription.value = existingSubscription;
        isSubscribed.value = true;
        await saveSubscriptionToServer(existingSubscription);
        loading.value = false;
        return true;
      }

      // Get VAPID public key from runtime config
      const config = useRuntimeConfig();
      const vapidPublicKey = config.public.vapidPublicKey;

      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push notifications
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      subscription.value = newSubscription;
      isSubscribed.value = true;

      // Save subscription to server
      await saveSubscriptionToServer(newSubscription);

      loading.value = false;
      return true;
    } catch (err) {
      console.error('Error subscribing to push notifications:', err);
      error.value = 'Failed to subscribe to push notifications';
      loading.value = false;
      return false;
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async (): Promise<boolean> => {
    if (!subscription.value) {
      return true;
    }

    loading.value = true;
    error.value = null;

    try {
      await subscription.value.unsubscribe();
      await removeSubscriptionFromServer(subscription.value);

      subscription.value = null;
      isSubscribed.value = false;

      loading.value = false;
      return true;
    } catch (err) {
      console.error('Error unsubscribing from push notifications:', err);
      error.value = 'Failed to unsubscribe from push notifications';
      loading.value = false;
      return false;
    }
  };

  // Save subscription to server
  const saveSubscriptionToServer = async (sub: PushSubscription) => {
    const subscriptionData: PushSubscriptionData = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(sub.getKey('p256dh')),
        auth: arrayBufferToBase64(sub.getKey('auth')),
      },
    };

    await $fetch('/api/notifications/subscribe', {
      method: 'POST',
      body: subscriptionData,
    });
  };

  // Remove subscription from server
  const removeSubscriptionFromServer = async (sub: PushSubscription) => {
    await $fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      body: {
        endpoint: sub.endpoint,
      },
    });
  };

  // Check current subscription status
  const checkSubscription = async () => {
    if (!isSupported.value) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();

      if (sub) {
        subscription.value = sub;
        isSubscribed.value = true;
      } else {
        subscription.value = null;
        isSubscribed.value = false;
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };

  // Send a test notification
  const sendTestNotification = async () => {
    if (!isSubscribed.value) {
      error.value = 'Not subscribed to push notifications';
      return false;
    }

    try {
      await $fetch('/api/notifications/send-test', {
        method: 'POST',
      });
      return true;
    } catch (err) {
      console.error('Error sending test notification:', err);
      error.value = 'Failed to send test notification';
      return false;
    }
  };

  // Utility: Convert URL-safe base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  };

  // Utility: Convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer | null): string => {
    if (!buffer) return '';

    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Initialize on mount
  onMounted(() => {
    checkSupport();
    if (isSupported.value) {
      checkSubscription();
    }
  });

  return {
    // State
    isSupported: computed(() => isSupported.value),
    isSubscribed: computed(() => isSubscribed.value),
    permission: computed(() => permission.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    subscription: computed(() => subscription.value),

    // Methods
    requestPermission,
    subscribe,
    unsubscribe,
    checkSubscription,
    sendTestNotification,
  };
}
