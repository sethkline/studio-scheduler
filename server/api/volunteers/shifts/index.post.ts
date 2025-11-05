import { getSupabaseClient } from '~/server/utils/supabase'
import type { CreateVolunteerShiftForm } from '~/types/volunteers'

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

  const body = await readBody<CreateVolunteerShiftForm>(event)

  if (!body.role_name || !body.shift_date || !body.start_time || !body.end_time) {
    throw createError({
      statusCode: 400,
      message: 'Role name, shift date, start time, and end time are required',
    })
  }

  const { data: shift, error } = await client
    .from('volunteer_shifts')
    .insert({
      recital_id: body.recital_id,
      recital_show_id: body.recital_show_id,
      role_name: body.role_name,
      description: body.description,
      shift_date: body.shift_date,
      start_time: body.start_time,
      end_time: body.end_time,
      volunteers_needed: body.volunteers_needed || 1,
      location: body.location,
      notes: body.notes,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating volunteer shift:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create volunteer shift',
    })
  }

  return shift
})
