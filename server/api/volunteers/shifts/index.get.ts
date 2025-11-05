import { getSupabaseClient } from '~/server/utils/supabase'
import type { VolunteerShiftWithDetails } from '~/types/volunteers'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const query = getQuery(event)
  const recitalId = query.recital_id as string | undefined
  const showId = query.recital_show_id as string | undefined

  let shiftsQuery = client
    .from('volunteer_shifts')
    .select(`
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
    `)
    .order('shift_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (recitalId) {
    shiftsQuery = shiftsQuery.eq('recital_id', recitalId)
  }

  if (showId) {
    shiftsQuery = shiftsQuery.eq('recital_show_id', showId)
  }

  const { data: shifts, error } = await shiftsQuery

  if (error) {
    console.error('Error fetching volunteer shifts:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch volunteer shifts',
    })
  }

  // Fetch signups for each shift
  const shiftIds = shifts?.map((s) => s.id) || []
  let signups: any[] = []

  if (shiftIds.length > 0) {
    const { data: signupData } = await client
      .from('volunteer_signups')
      .select(`
        *,
        guardian:guardians (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .in('volunteer_shift_id', shiftIds)
      .eq('status', 'confirmed')

    signups = signupData || []
  }

  // Merge signups with shifts
  const shiftsWithSignups = shifts?.map((shift) => ({
    ...shift,
    signups: signups.filter((s) => s.volunteer_shift_id === shift.id),
  }))

  return shiftsWithSignups as VolunteerShiftWithDetails[]
})
