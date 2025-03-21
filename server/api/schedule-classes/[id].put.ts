import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    // Update the schedule class
    const { data, error } = await client
      .from('schedule_classes')
      .update({
        schedule_id: body.schedule_id,
        class_instance_id: body.class_instance_id,
        day_of_week: body.day_of_week,
        start_time: body.start_time,
        end_time: body.end_time,
        studio_room_id: body.studio_id, // Use studio_room_id here
        teacher_id: body.teacher_id
      })
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    return {
      message: 'Schedule class updated successfully',
      scheduleClass: data[0]
    }
  } catch (error) {
    console.error('Update schedule class API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update schedule class'
    })
  }
})