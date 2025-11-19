import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    
    const { error } = await client
      .from('schedule_classes')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return {
      message: 'Schedule class deleted successfully'
    }
  } catch (error) {
    console.error('Delete schedule class API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete schedule class'
    })
  }
})