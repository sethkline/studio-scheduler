/**
 * PWA Cache Isolation Plugin
 * Ensures user-specific caching and prevents cross-user data leaks
 */
export default defineNuxtPlugin((nuxtApp) => {
  const user = useSupabaseUser()

  // Watch for user changes (login/logout)
  watch(user, async (newUser, oldUser) => {
    // If user logged out or switched users, clear caches
    if (oldUser && (!newUser || newUser.id !== oldUser.id)) {
      console.log('User changed, clearing service worker caches')

      try {
        // Clear service worker caches
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames
              .filter(name =>
                name.includes('api-cache') ||
                name.includes('supabase-storage') ||
                name.includes('public-api-cache')
              )
              .map(name => caches.delete(name))
          )
          console.log('Service worker caches cleared')
        }

        // Clear IndexedDB user data
        const { offlineStorage } = await import('~/utils/offlineStorage')
        if (oldUser?.id) {
          await offlineStorage.clearUserData(oldUser.id)
          console.log('IndexedDB user data cleared')
        }
      } catch (error) {
        console.error('Error clearing caches on user change:', error)
      }
    }
  })

  // Add cache versioning to requests
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      // Send user ID to service worker for user-specific caching
      registration.active?.postMessage({
        type: 'USER_CHANGED',
        userId: user.value?.id,
      })

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CACHE_CLEARED') {
          console.log('Service worker reported cache cleared')
        }
      })
    })
  }

  return {
    provide: {
      clearPwaCache: async () => {
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(cacheNames.map(name => caches.delete(name)))
        }
      },
    },
  }
})
