import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.schedule_id || !body.class_instance_id || body.day_of_week === undefined || 
        !body.start_time || !body.end_time || !body.studio_id) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    // Insert the new schedule class
    // Using studio_room_id instead of studio_id
    const { data, error } = await client
      .from('schedule_classes')
      .insert([{
        schedule_id: body.schedule_id,
        class_instance_id: body.class_instance_id,
        day_of_week: body.day_of_week,
        start_time: body.start_time,
        end_time: body.end_time,
        studio_room_id: body.studio_id, // Use studio_room_id here
        teacher_id: body.teacher_id
      }])
      .select()
    
    if (error) throw error
    
    return {
      message: 'Schedule class created successfully',
      scheduleClass: data[0]
    }
  } catch (error) {
    console.error('Add schedule class API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create schedule class'
    })
  }
})