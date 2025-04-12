// server/api/recital-series/[id]/index.delete.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    
    const { error } = await client
      .from('recital_series')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return {
      message: 'Recital series deleted successfully'
    }
  } catch (error) {
    console.error('Delete recital series API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete recital series'
    })
  }
})