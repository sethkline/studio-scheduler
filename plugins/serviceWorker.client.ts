/**
 * Service Worker Registration Plugin
 * Registers the manual service worker for PWA functionality
 */

export default defineNuxtPlugin(() => {
  // Only run in browser
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Register service worker
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[PWA] Service Worker registered successfully:', registration);

      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New service worker available
              console.log('[PWA] New service worker available');

              // Notify user about update (handled by PwaUpdatePrompt component)
              window.dispatchEvent(
                new CustomEvent('swUpdate', {
                  detail: { registration },
                })
              );
            }
          });
        }
      });

      // Handle controller change (when new SW takes over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] New service worker activated');
        // Optionally reload the page
        // window.location.reload();
      });
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  });

  // Handle messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('[PWA] Message from service worker:', event.data);

    if (event.data && event.data.type === 'CACHE_UPDATED') {
      console.log('[PWA] Cache updated for:', event.data.url);
    }
  });
});
