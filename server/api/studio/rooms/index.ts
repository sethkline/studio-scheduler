import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    
    const { data, error } = await client
      .from('studio_rooms')
      .select('*')
      .order('name')
    
    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Rooms API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch rooms'
    })
  }
})