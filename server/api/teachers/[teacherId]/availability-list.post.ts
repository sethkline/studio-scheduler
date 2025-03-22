// server/api/teachers/[teacherId]/availability-list.post.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const teacherId = getRouterParam(event, 'teacherId')
    const body = await readBody(event)
    
    // Validate required fields
    if ((!body.day_of_week && body.day_of_week !== 0) || !body.start_time || !body.end_time) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: day_of_week, start_time, end_time'
      })
    }
    
    // Ensure schedule_id is provided
    if (!body.schedule_id) {
      // If not provided, find the active schedule
      const { data: activeSchedules, error: scheduleError } = await client
        .from('schedules')
        .select('id')
        .eq('is_active', true)
        .limit(1)
      
      if (scheduleError) throw scheduleError
      
      if (activeSchedules && activeSchedules.length > 0) {
        body.schedule_id = activeSchedules[0].id
      } else {
        return createError({
          statusCode: 400,
          statusMessage: 'No active schedule found and no schedule_id provided'
        })
      }
    }
    
    // Add teacher_id to the body
    body.teacher_id = teacherId
    
    // Set defaults if not provided
    if (body.recurring === undefined) {
      body.recurring = true
    }
    
    if (body.is_available === undefined) {
      body.is_available = true
    }
    
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