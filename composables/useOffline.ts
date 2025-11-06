import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useOnline } from '@vueuse/core';

interface QueuedAction {
  id: string;
  type: 'api-call' | 'data-update';
  endpoint?: string;
  method?: string;
  data?: any;
  timestamp: number;
  retries: number;
}

export function useOffline() {
  const isOnline = useOnline();
  const isOffline = computed(() => !isOnline.value);
  const actionQueue = ref<QueuedAction[]>([]);
  const syncInProgress = ref(false);

  // Load queued actions from localStorage on mount
  const loadQueueFromStorage = () => {
    try {
      const stored = localStorage.getItem('offline-action-queue');
      if (stored) {
        actionQueue.value = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
      actionQueue.value = [];
    }
  };

  // Save queued actions to localStorage
  const saveQueueToStorage = () => {
    try {
      localStorage.setItem('offline-action-queue', JSON.stringify(actionQueue.value));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  };

  // Add action to queue
  const queueAction = (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>) => {
    const queuedAction: QueuedAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
    };

    actionQueue.value.push(queuedAction);
    saveQueueToStorage();

    return queuedAction.id;
  };

  // Remove action from queue
  const removeAction = (actionId: string) => {
    actionQueue.value = actionQueue.value.filter(a => a.id !== actionId);
    saveQueueToStorage();
  };

  // Process queued actions when online
  const processQueue = async () => {
    if (!isOnline.value || syncInProgress.value || actionQueue.value.length === 0) {
      return;
    }

    syncInProgress.value = true;
    const actionsToProcess = [...actionQueue.value];

    for (const action of actionsToProcess) {
      try {
        if (action.type === 'api-call' && action.endpoint) {
          // Attempt to execute the API call
          await $fetch(action.endpoint, {
            method: action.method || 'GET',
            body: action.data,
          });

          // If successful, remove from queue
          removeAction(action.id);
        }
      } catch (error) {
        console.error('Error processing queued action:', error);

        // Increment retry count
        const actionIndex = actionQueue.value.findIndex(a => a.id === action.id);
        if (actionIndex !== -1) {
          actionQueue.value[actionIndex].retries++;

          // Remove action if retries exceed limit (5 attempts)
          if (actionQueue.value[actionIndex].retries >= 5) {
            console.warn('Action failed after 5 retries, removing from queue:', action);
            removeAction(action.id);
          } else {
            saveQueueToStorage();
          }
        }
      }
    }

    syncInProgress.value = false;
  };

  // Check if a specific feature is available offline
  const isFeatureAvailableOffline = (feature: string): boolean => {
    const offlineFeatures = [
      'view-schedule',
      'view-students',
      'view-classes',
      'view-profile',
    ];

    return offlineFeatures.includes(feature);
  };

  // Get user-friendly offline message
  const getOfflineMessage = (feature?: string): string => {
    if (isOnline.value) {
      return '';
    }

    if (feature && !isFeatureAvailableOffline(feature)) {
      return `This feature requires an internet connection. Please check your connection and try again.`;
    }

    return 'You are currently offline. Some features may be limited.';
  };

  // Watch for online status changes
  watch(isOnline, (online) => {
    if (online) {
      console.log('Connection restored, processing queued actions...');
      // Small delay to ensure network is stable
      setTimeout(() => {
        processQueue();
      }, 1000);
    } else {
      console.log('Connection lost, entering offline mode');
    }
  });

  onMounted(() => {
    loadQueueFromStorage();

    // Process queue on mount if online
    if (isOnline.value) {
      processQueue();
    }

    // Register background sync if supported
    if ('serviceWorker' in navigator && 'sync' in (window as any).registration) {
      navigator.serviceWorker.ready.then((registration: any) => {
        registration.sync.register('sync-queued-actions').catch((error: any) => {
          console.error('Background sync registration failed:', error);
        });
      });
    }
  });

  return {
    isOnline,
    isOffline,
    actionQueue: computed(() => actionQueue.value),
    syncInProgress: computed(() => syncInProgress.value),
    queueAction,
    removeAction,
    processQueue,
    isFeatureAvailableOffline,
    getOfflineMessage,
    queuedActionCount: computed(() => actionQueue.value.length),
  };
}
