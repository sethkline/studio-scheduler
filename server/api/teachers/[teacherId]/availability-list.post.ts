import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const teacherId = getRouterParam(event, 'teacherId')
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.day_of_week && body.day_of_week !== 0 || !body.start_time || !body.end_time) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: day_of_week, start_time, end_time'
      })
    }
    
    // Add teacher_id to the body
    body.teacher_id = teacherId
    
    const { data, error } = await client
      .from('teacher_availability')
      .insert([body])
      .select()
    
    if (error) throw error
    
    return {
      message: 'Availability created successfully',
      availability: data[0]
    }
  } catch (error) {
    console.error('Add availability API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create availability'
    })
  }
})