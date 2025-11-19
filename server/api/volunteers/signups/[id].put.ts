import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'
import type { UpdateVolunteerSignupForm } from '~/types/volunteers'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
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
      message: 'Permission denied - only admin and staff can update signups',
    })
  }

  const signupId = getRouterParam(event, 'id')
  const body = await readBody<UpdateVolunteerSignupForm>(event)

  if (!signupId) {
    throw createError({
      statusCode: 400,
      message: 'Signup ID is required',
    })
  }

  const updateData: any = {}

  if (body.status !== undefined) updateData.status = body.status
  if (body.hours_credited !== undefined) updateData.hours_credited = body.hours_credited
  if (body.notes !== undefined) updateData.notes = body.notes

  const { data: signup, error } = await client
    .from('volunteer_signups')
    .update(updateData)
    .eq('id', signupId)
    .select()
    .single()

  if (error) {
    console.error('Error updating volunteer signup:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update volunteer signup',
    })
  }

  return signup
})
