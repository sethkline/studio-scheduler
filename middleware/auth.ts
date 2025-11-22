export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser()
  const authStore = useAuthStore()

  // If user is not logged in and trying to access a protected route
  if (!user.value && to.path !== '/login' && to.path !== '/register' && to.path !== '/register-parent' && !to.path.startsWith('/public')) {
    return navigateTo('/login')
  }

  // If user is logged in and trying to access login/register pages, redirect based on role
  if (user.value && (to.path === '/login' || to.path === '/register' || to.path === '/register-parent')) {
    // Ensure profile is loaded
    if (!authStore.profile) {
      await authStore.fetchUserProfile()
    }

    // Redirect to role-appropriate dashboard
    const role = authStore.userRole

    if (role === 'admin' || role === 'staff') {
      return navigateTo('/admin/dashboard')
    } else if (role === 'teacher') {
      return navigateTo('/teacher/dashboard')
    } else if (role === 'parent') {
      return navigateTo('/parent/dashboard')
    } else if (role === 'student') {
      return navigateTo('/student/dashboard')
    }

    // Default fallback to home
    return navigateTo('/')
  }
})