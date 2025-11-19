// API Endpoint: Check in a volunteer for their shift
// Story 2.1.5: Volunteer Coordination Center
// Records check-in time and user

import { getSupabaseClient } from '~/server/utils/supabase'

interface CheckInRequest {
  signupId: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CheckInRequest>(event)
  const user = event.context.user

  if (!body.signupId) {
    throw createError({
      statusCode: 400,
      message: 'Signup ID is required'
    })
  }

  const client = getSupabaseClient()

  try {
    const { data: signup, error } = await client
      .from('volunteer_signups')
      .update({
        checked_in_at: new Date().toISOString(),
        checked_in_by: user?.id
      })
      .eq('id', body.signupId)
      .select(`
        *,
        profiles:parent_id (
          full_name,
          email
        ),
        volunteer_shifts (
          role,
          shift_date,
          start_time
        )
      `)
      .single()

    if (error) throw error

    return {
      success: true,
      signup
    }
  } catch (error: any) {
    console.error('Error checking in volunteer:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to check in volunteer'
    })
  }
})
