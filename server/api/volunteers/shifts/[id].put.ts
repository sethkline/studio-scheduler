import { getSupabaseClient } from '~/server/utils/supabase'
import type { UpdateVolunteerShiftForm } from '~/types/volunteers'

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
  const body = await readBody<UpdateVolunteerShiftForm>(event)

  if (!shiftId) {
    throw createError({
      statusCode: 400,
      message: 'Shift ID is required',
    })
  }

  const updateData: any = {}

  if (body.role_name !== undefined) updateData.role_name = body.role_name
  if (body.description !== undefined) updateData.description = body.description
  if (body.shift_date !== undefined) updateData.shift_date = body.shift_date
  if (body.start_time !== undefined) updateData.start_time = body.start_time
  if (body.end_time !== undefined) updateData.end_time = body.end_time
  if (body.volunteers_needed !== undefined) updateData.volunteers_needed = body.volunteers_needed
  if (body.volunteers_filled !== undefined) updateData.volunteers_filled = body.volunteers_filled
  if (body.location !== undefined) updateData.location = body.location
  if (body.notes !== undefined) updateData.notes = body.notes

  const { data: shift, error } = await client
    .from('volunteer_shifts')
    .update(updateData)
    .eq('id', shiftId)
    .select()
    .single()

  if (error) {
    console.error('Error updating volunteer shift:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update volunteer shift',
    })
  }

  return shift
})
