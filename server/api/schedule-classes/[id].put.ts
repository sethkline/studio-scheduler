// server/api/schedule-classes/[id].put.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    console.log('Updating schedule class with ID:', id)
    console.log('Update data:', body)
    
    // Update the schedule class
    const { error: updateError } = await client
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
    
    if (updateError) throw updateError
    
    // After updating, fetch the complete data with relationships
    const { data, error: fetchError } = await client
      .from('schedule_classes')
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        teacher_id,
        class_instance_id,
        studio_room_id,
        class_instance:class_instance_id (
          id,
          name,
          teacher:teacher_id (id, first_name, last_name),
          class_definition:class_definition_id (
            id,
            name,
            dance_style:dance_style_id (id, name, color)
          )
        ),
        studio:studio_room_id (id, name)
      `)
      .eq('id', id)
      .single()
    
    if (fetchError) throw fetchError
    
    console.log('Updated schedule class data:', data)
    
    return {
      message: 'Schedule class updated successfully',
      scheduleClass: data
    }
  } catch (error) {
    console.error('Update schedule class API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update schedule class'
    })
  }
})