/**
 * Global middleware to protect /admin/* routes
 * Automatically redirects unauthenticated users to login
 * Redirects non-admin users to unauthorized
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Only check if accessing /admin/* routes
  if (!to.path.startsWith('/admin')) {
    return
  }

  const user = useSupabaseUser()
  const authStore = useAuthStore()

  // If not logged in, redirect to login with return URL
  if (!user.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }

  // Ensure profile is loaded
  if (!authStore.isProfileLoaded) {
    await authStore.fetchUserProfile()
  }

  // Check if user has admin or staff access
  // (staff can access most admin pages, full admin needed for sensitive operations)
  const hasAccess = authStore.isAdmin || authStore.hasRole('staff')

  if (!hasAccess) {
    console.warn(`Access denied: User ${user.value.id} attempted to access admin route ${to.path}`)
    return navigateTo('/unauthorized')
  }
})
