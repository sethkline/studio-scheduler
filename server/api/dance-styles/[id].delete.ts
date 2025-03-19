import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    
    const { error } = await client
      .from('dance_styles')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return {
      message: 'Dance style deleted successfully'
    }
  } catch (error) {
    console.error('Delete dance style API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete dance style'
    })
  }
})