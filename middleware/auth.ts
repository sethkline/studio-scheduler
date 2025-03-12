export default defineNuxtRouteMiddleware((to, from) => {
  const user = useSupabaseUser()
  
  // If user is not logged in and trying to access a protected route
  if (!user.value && to.path !== '/login' && to.path !== '/register') {
    return navigateTo('/login')
  }
  
  // If user is logged in and trying to access login/register pages
  if (user.value && (to.path === '/login' || to.path === '/register')) {
    return navigateTo('/')
  }
})