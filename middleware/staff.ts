/**
 * Staff middleware - requires admin or staff role
 * Use this on routes that should be accessible to admin and staff members
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

  // Check if user has admin or staff role
  if (!authStore.hasAdminAccess) {
    console.warn(`Access denied: User ${user.value.id} attempted to access staff route ${to.path}`)
    return navigateTo('/unauthorized')
  }
})
