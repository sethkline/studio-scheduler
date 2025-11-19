import { requireAuth, requireAdmin } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdmin(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    
    // Check if location is being used in any schedule
    const { data: usedInSchedule, error: scheduleError } = await client
      .from('schedule_classes')
      .select('id')
      .eq('studio_id', id)
      .limit(1)
    
    if (scheduleError) throw scheduleError
    
    if (usedInSchedule && usedInSchedule.length > 0) {
      return createError({
        statusCode: 400,
        statusMessage: 'Cannot delete location that is being used in schedules'
      })
    }
    
    // Delete the location
    const { error } = await client
      .from('studio_locations')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return {
      message: 'Location deleted successfully'
    }
  } catch (error) {
    console.error('Delete location API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete location'
    })
  }
})