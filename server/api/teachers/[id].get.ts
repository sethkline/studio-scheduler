import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    
    const { data, error } = await client
      .from('teachers')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Get teacher API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch teacher'
    })
  }
})