import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const showId = getRouterParam(event, 'id')

  try {
    const { data: rooms, error } = await client
      .from('dressing_rooms')
      .select(`
        *,
        check_ins:show_day_check_ins(count)
      `)
      .eq('recital_show_id', showId)
      .eq('is_active', true)
      .order('room_name')

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to fetch dressing rooms' })

    const roomsWithCounts = (rooms || []).map(room => ({
      ...room,
      checked_in_count: (room.check_ins as any)[0]?.count || 0,
    }))

    return { rooms: roomsWithCounts }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch dressing rooms',
    })
  }
})
