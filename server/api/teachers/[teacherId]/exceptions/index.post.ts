import { getSupabaseClient } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const teacherId = getRouterParam(event, 'teacherId')
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.exception_date || body.is_available === undefined) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: exception_date, is_available'
      })
    }
    
    // Add teacher_id to the body
    body.teacher_id = teacherId
    
    const { data, error } = await client
      .from('teacher_availability_exceptions')
      .insert([body])
      .select()
    
    if (error) throw error
    
    return {
      message: 'Exception created successfully',
      exception: data[0]
    }
  } catch (error) {
    console.error('Add exception API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create availability exception'
    })
  }
})