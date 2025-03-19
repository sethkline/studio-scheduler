import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    const { data, error } = await client
      .from('teachers')
      .update(body)
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    return {
      message: 'Teacher updated successfully',
      teacher: data[0]
    }
  } catch (error) {
    console.error('Update teacher API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update teacher'
    })
  }
})