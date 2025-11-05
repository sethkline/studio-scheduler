import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Get user profile to check role
  const { data: profile } = await client
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'staff'].includes(profile.user_role)) {
    throw createError({
      statusCode: 403,
      message: 'Permission denied',
    })
  }

  const shiftId = getRouterParam(event, 'id')

  if (!shiftId) {
    throw createError({
      statusCode: 400,
      message: 'Shift ID is required',
    })
  }

  const { error } = await client
    .from('volunteer_shifts')
    .delete()
    .eq('id', shiftId)

  if (error) {
    console.error('Error deleting volunteer shift:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete volunteer shift',
    })
  }

  return { success: true }
})
