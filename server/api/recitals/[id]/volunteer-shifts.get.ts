import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const recitalShowId = getRouterParam(event, 'id')

  try {
    const { data: recital } = await client
      .from('recital_shows')
      .select('id, name')
      .eq('id', recitalShowId)
      .single()

    const { data: shifts, error } = await client
      .from('volunteer_shifts')
      .select(`
        *,
        volunteers:volunteer_assignments(
          id,
          status,
          volunteer:profiles!volunteer_assignments_volunteer_user_id_fkey(id, first_name, last_name, email)
        )
      `)
      .eq('recital_show_id', recitalShowId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to fetch shifts' })

    const summary = {
      total_shifts: shifts?.length || 0,
      open_shifts: shifts?.filter(s => s.status === 'open').length || 0,
      filled_shifts: shifts?.filter(s => s.slots_filled >= s.slots_total).length || 0,
      total_slots: shifts?.reduce((sum, s) => sum + s.slots_total, 0) || 0,
      filled_slots: shifts?.reduce((sum, s) => sum + s.slots_filled, 0) || 0,
      fill_rate: 0,
      total_volunteers: new Set(shifts?.flatMap(s => s.volunteers?.map((v: any) => v.volunteer?.id)).filter(Boolean)).size,
      confirmed_volunteers: 0,
      upcoming_shifts: shifts?.filter(s => new Date(s.date) >= new Date()).length || 0,
    }

    if (summary.total_slots > 0) {
      summary.fill_rate = Math.round((summary.filled_slots / summary.total_slots) * 100)
    }

    return { shifts: shifts || [], summary, recital }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Failed to fetch shifts' })
  }
})
