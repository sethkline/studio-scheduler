import { getSupabaseClient } from '~/server/utils/supabase'
import type { VolunteerSignupWithDetails } from '~/types/volunteers'

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

  if (!profile) {
    throw createError({
      statusCode: 404,
      message: 'User profile not found',
    })
  }

  const query = getQuery(event)
  const recitalId = query.recital_id as string | undefined

  let signupsQuery = client
    .from('volunteer_signups')
    .select(`
      *,
      guardian:guardians (
        id,
        first_name,
        last_name
      ),
      volunteer_shift:volunteer_shifts (
        *,
        recital:recitals (
          id,
          name
        ),
        recital_show:recital_shows (
          id,
          title,
          date,
          start_time
        )
      )
    `)
    .order('signup_date', { ascending: false })

  // If parent, only show their own signups
  if (profile.user_role === 'parent') {
    const { data: guardian } = await client
      .from('guardians')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!guardian) {
      throw createError({
        statusCode: 404,
        message: 'Guardian profile not found',
      })
    }

    signupsQuery = signupsQuery.eq('guardian_id', guardian.id)
  }

  // Optional filter by recital
  if (recitalId) {
    // Need to join through volunteer_shifts to filter by recital
    signupsQuery = signupsQuery.eq('volunteer_shift.recital_id', recitalId)
  }

  const { data: signups, error } = await signupsQuery

  if (error) {
    console.error('Error fetching volunteer signups:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch volunteer signups',
    })
  }

  return signups as VolunteerSignupWithDetails[]
})
