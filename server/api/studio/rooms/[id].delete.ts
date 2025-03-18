import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    
    // Check if room is being used in any schedule
    const { data: usedInSchedule, error: scheduleError } = await client
      .from('schedule_classes')
      .select('id')
      .eq('studio_room_id', id)
      .limit(1)
    
    if (scheduleError) throw scheduleError
    
    if (usedInSchedule && usedInSchedule.length > 0) {
      return createError({
        statusCode: 400,
        statusMessage: 'Cannot delete room that is being used in schedules'
      })
    }
    
    // Delete the room
    const { error } = await client
      .from('studio_rooms')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return {
      message: 'Room deleted successfully'
    }
  } catch (error) {
    console.error('Delete room API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete room'
    })
  }
})