import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const teacherId = getRouterParam(event, 'teacherId')
    const id = getRouterParam(event, 'id')
    
    // Validate teacher_id matches
    const { data: existingAvailability, error: fetchError } = await client
      .from('teacher_availability')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError) throw fetchError
    
    if (existingAvailability.teacher_id !== teacherId) {
      return createError({
        statusCode: 403,
        statusMessage: 'Unauthorized access to availability record'
      })
    }
    
    // Delete the availability record
    const { error } = await client
      .from('teacher_availability')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return {
      message: 'Availability deleted successfully'
    }
  } catch (error) {
    console.error('Delete availability API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete availability'
    })
  }
})