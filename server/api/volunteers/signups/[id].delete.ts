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

  const signupId = getRouterParam(event, 'id')

  if (!signupId) {
    throw createError({
      statusCode: 400,
      message: 'Signup ID is required',
    })
  }

  // Get the signup to verify ownership and get shift info
  const { data: signup } = await client
    .from('volunteer_signups')
    .select('guardian_id, volunteer_shift_id')
    .eq('id', signupId)
    .single()

  if (!signup) {
    throw createError({
      statusCode: 404,
      message: 'Signup not found',
    })
  }

  // Get user profile
  const { data: profile } = await client
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw createError({
      statusCode: 404,
      message: 'User profile not found',
    })
  }

  // Check permissions: parent can only delete their own, staff/admin can delete any
  if (profile.user_role === 'parent') {
    const { data: guardian } = await client
      .from('guardians')
      .select('id')
      .eq('id', signup.guardian_id)
      .eq('user_id', user.id)
      .single()

    if (!guardian) {
      throw createError({
        statusCode: 403,
        message: 'Access denied',
      })
    }
  } else if (!['admin', 'staff'].includes(profile.user_role)) {
    throw createError({
      statusCode: 403,
      message: 'Permission denied',
    })
  }

  // Delete the signup
  const { error } = await client
    .from('volunteer_signups')
    .delete()
    .eq('id', signupId)

  if (error) {
    console.error('Error deleting volunteer signup:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete volunteer signup',
    })
  }

  // Update volunteers_filled count
  const { data: shift } = await client
    .from('volunteer_shifts')
    .select('volunteers_filled')
    .eq('id', signup.volunteer_shift_id)
    .single()

  if (shift && shift.volunteers_filled > 0) {
    await client
      .from('volunteer_shifts')
      .update({ volunteers_filled: shift.volunteers_filled - 1 })
      .eq('id', signup.volunteer_shift_id)
  }

  return { success: true }
})
