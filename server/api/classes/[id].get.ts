// server/api/classes/[id].get.ts
import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    
    const { data, error } = await client
      .from('class_definitions')
      .select(`
        id,
        name,
        min_age,
        max_age,
        description,
        duration,
        max_students,
        dance_style:dance_style_id (id, name, color),
        class_level:class_level_id (id, name)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Get class API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch class'
    })
  }
})