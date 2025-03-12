export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser()
  const client = useSupabaseClient()
  
  // If not logged in, redirect to login
  if (!user.value) {
    return navigateTo('/login')
  }
  
  // Check if user has admin role
  const { data, error } = await client
    .from('profiles')
    .select('user_role')
    .eq('id', user.value.id)
    .single()
  
  if (error || data?.user_role !== 'admin') {
    return navigateTo('/unauthorized')
  }
})