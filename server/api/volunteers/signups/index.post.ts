import { getSupabaseClient } from '~/server/utils/supabase'
import type { CreateVolunteerSignupForm } from '~/types/volunteers'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const body = await readBody<CreateVolunteerSignupForm>(event)

  if (!body.volunteer_shift_id || !body.guardian_id) {
    throw createError({
      statusCode: 400,
      message: 'Volunteer shift ID and guardian ID are required',
    })
  }

  // Get user profile to check role
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

  // If parent, verify they own this guardian account
  if (profile.user_role === 'parent') {
    const { data: guardian } = await client
      .from('guardians')
      .select('id')
      .eq('id', body.guardian_id)
      .eq('user_id', user.id)
      .single()

    if (!guardian) {
      throw createError({
        statusCode: 403,
        message: 'Access denied',
      })
    }
  }

  // Check if shift exists and has capacity
  const { data: shift } = await client
    .from('volunteer_shifts')
    .select('id, volunteers_needed, volunteers_filled')
    .eq('id', body.volunteer_shift_id)
    .single()

  if (!shift) {
    throw createError({
      statusCode: 404,
      message: 'Volunteer shift not found',
    })
  }

  if (shift.volunteers_filled >= shift.volunteers_needed) {
    throw createError({
      statusCode: 400,
      message: 'This shift is already full',
    })
  }

  // Check if guardian already signed up for this shift
  const { data: existingSignup } = await client
    .from('volunteer_signups')
    .select('id')
    .eq('volunteer_shift_id', body.volunteer_shift_id)
    .eq('guardian_id', body.guardian_id)
    .single()

  if (existingSignup) {
    throw createError({
      statusCode: 400,
      message: 'Already signed up for this shift',
    })
  }

  // Calculate hours based on shift duration
  const { data: shiftDetails } = await client
    .from('volunteer_shifts')
    .select('start_time, end_time')
    .eq('id', body.volunteer_shift_id)
    .single()

  let hoursCredited = 1 // Default 1 hour
  if (shiftDetails) {
    const start = new Date(`2000-01-01T${shiftDetails.start_time}`)
    const end = new Date(`2000-01-01T${shiftDetails.end_time}`)
    const diffMs = end.getTime() - start.getTime()
    hoursCredited = Math.max(1, diffMs / (1000 * 60 * 60)) // Convert to hours, minimum 1
  }

  // Create signup
  const { data: signup, error: signupError } = await client
    .from('volunteer_signups')
    .insert({
      volunteer_shift_id: body.volunteer_shift_id,
      guardian_id: body.guardian_id,
      hours_credited: hoursCredited,
      notes: body.notes,
    })
    .select()
    .single()

  if (signupError) {
    console.error('Error creating volunteer signup:', signupError)
    throw createError({
      statusCode: 500,
      message: 'Failed to create volunteer signup',
    })
  }

  // Update volunteers_filled count
  await client
    .from('volunteer_shifts')
    .update({ volunteers_filled: shift.volunteers_filled + 1 })
    .eq('id', body.volunteer_shift_id)

  return signup
})
