// server/api/recital-shows/[id]/index.put.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    const { data, error } = await client
      .from('recital_shows')
      .update(body)
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    return {
      message: 'Recital show updated successfully',
      show: data[0]
    }
  } catch (error) {
    console.error('Update recital show API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update recital show'
    })
  }
})