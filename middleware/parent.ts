/**
 * Parent middleware - requires parent role or higher
 * Use this on routes that should be accessible to parents and above
 */
export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser()
  const authStore = useAuthStore()

  // If not logged in, redirect to login
  if (!user.value) {
    return navigateTo('/login')
  }

  // Ensure profile is loaded
  if (!authStore.isProfileLoaded) {
    await authStore.fetchUserProfile()
  }

  // Check if user has parent role or higher
  if (!authStore.hasRole(['admin', 'staff', 'teacher', 'parent'])) {
    console.warn(`Access denied: User ${user.value.id} attempted to access parent route ${to.path}`)
    return navigateTo('/unauthorized')
  }
})
