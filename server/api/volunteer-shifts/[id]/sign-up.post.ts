import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const shiftId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const user = event.context.user

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    // Check if shift exists and has capacity
    const { data: shift, error: shiftError } = await client
      .from('volunteer_shifts')
      .select('*')
      .eq('id', shiftId)
      .single()

    if (shiftError || !shift) {
      throw createError({ statusCode: 404, statusMessage: 'Shift not found' })
    }

    if (shift.slots_filled >= shift.slots_total) {
      throw createError({ statusCode: 400, statusMessage: 'This shift is already full' })
    }

    // Check if already signed up
    const { data: existing } = await client
      .from('volunteer_assignments')
      .select('id')
      .eq('shift_id', shiftId)
      .eq('volunteer_user_id', user.id)
      .single()

    if (existing) {
      throw createError({ statusCode: 400, statusMessage: 'You are already signed up for this shift' })
    }

    // Create assignment
    const { error: assignError } = await client
      .from('volunteer_assignments')
      .insert([{
        shift_id: shiftId,
        volunteer_user_id: user.id,
        status: 'pending',
        signed_up_at: new Date().toISOString(),
        notes: body.notes || null,
      }])

    if (assignError) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to sign up for shift' })
    }

    // Update shift slots_filled count
    await client
      .from('volunteer_shifts')
      .update({ slots_filled: shift.slots_filled + 1 })
      .eq('id', shiftId)

    return { message: 'Successfully signed up for shift' }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Failed to sign up for shift' })
  }
})
