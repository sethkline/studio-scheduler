import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    
    const { error } = await client
      .from('teachers')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return {
      message: 'Teacher deleted successfully'
    }
  } catch (error) {
    console.error('Delete teacher API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete teacher'
    })
  }
})