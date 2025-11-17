import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const shiftId = getRouterParam(event, 'id')

  try {
    const { data: shift, error } = await client
      .from('volunteer_shifts')
      .select(`
        *,
        volunteers:volunteer_assignments(
          id,
          status,
          volunteer:profiles!volunteer_assignments_volunteer_user_id_fkey(id, first_name, last_name, email)
        )
      `)
      .eq('id', shiftId)
      .single()

    if (error) {
      throw createError({ statusCode: 404, statusMessage: 'Shift not found' })
    }

    return shift
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Failed to fetch shift' })
  }
})
