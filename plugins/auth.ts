/**
 * Auth plugin - automatically loads user profile on app initialization
 * This ensures the auth store is populated before any components render
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  const user = useSupabaseUser()
  const authStore = useAuthStore()

  // Watch for auth state changes
  watch(
    user,
    async (newUser, oldUser) => {
      if (newUser && !authStore.isProfileLoaded) {
        // User logged in - fetch their profile
        await authStore.fetchUserProfile()
      } else if (!newUser && oldUser) {
        // User logged out - clear profile
        authStore.clearProfile()
      }
    },
    { immediate: true }
  )
})
