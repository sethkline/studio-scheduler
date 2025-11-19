/**
 * Offline Plugin
 * Initializes offline storage and sets up background sync
 */

import { offlineStorage } from '~/utils/offlineStorage';

export default defineNuxtPlugin(async () => {
  // Initialize IndexedDB
  try {
    await offlineStorage.init();
    console.log('Offline storage initialized');
  } catch (error) {
    console.error('Failed to initialize offline storage:', error);
  }

  // Clear expired cache on startup
  try {
    await offlineStorage.clearExpired();
  } catch (error) {
    console.error('Failed to clear expired cache:', error);
  }

  // Register background sync if supported
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;

      // Listen for sync events
      if ('sync' in registration) {
        console.log('Background sync is supported');

        // Register periodic sync for data updates (if supported)
        if ('periodicSync' in registration) {
          try {
            // @ts-ignore - periodicSync is not in all browsers
            await registration.periodicSync.register('update-cache', {
              minInterval: 60 * 60 * 1000, // 1 hour
            });
            console.log('Periodic background sync registered');
          } catch (error) {
            console.warn('Periodic background sync not available:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to setup background sync:', error);
    }
  }

  // Listen for online/offline events
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      console.log('Connection restored');
    });

    window.addEventListener('offline', () => {
      console.log('Connection lost');
    });
  }
});
