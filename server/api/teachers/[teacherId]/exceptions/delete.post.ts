import { getSupabaseClient } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const teacherId = getRouterParam(event, 'teacherId')
    const body = await readBody(event)
    const id = body.id 
    
    // Validate teacher_id matches
    const { data: existingException, error: fetchError } = await client
      .from('teacher_availability_exceptions')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError) throw fetchError
    
    if (existingException.teacher_id !== teacherId) {
      return createError({
        statusCode: 403,
        statusMessage: 'Unauthorized access to exception record'
      })
    }
    
    const { error } = await client
      .from('teacher_availability_exceptions')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return {
      message: 'Exception deleted successfully'
    }
  } catch (error) {
    console.error('Delete exception API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete availability exception'
    })
  }
})