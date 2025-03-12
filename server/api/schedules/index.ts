// server/api/schedules/index.ts
import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)
    
    // Get active schedule or specific one if ID provided
    const scheduleId = query.id as string
    
    let schedule
    if (scheduleId) {
      const { data, error } = await client
        .from('schedules')
        .select('*')
        .eq('id', scheduleId)
        .single()
      
      if (error) throw error
      schedule = data
    } else {
      const { data, error } = await client
        .from('schedules')
        .select('*')
        .eq('is_active', true)
        .single()
      
      if (error) throw error
      schedule = data
    }
    
    // Fetch schedule classes
    const { data: classes, error } = await client
      .from('schedule_classes')
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
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
        studio:studio_id (id, name)
      `)
      .eq('schedule_id', schedule.id)
      .order('day_of_week')
      .order('start_time')
    
    if (error) throw error
    
    // Format the data for easier consumption by the frontend
    const formattedClasses = classes.map(cls => ({
      id: cls.id,
      dayOfWeek: cls.day_of_week,
      startTime: cls.start_time,
      endTime: cls.end_time,
      classInstanceId: cls.class_instance?.id,
      className: cls.class_instance?.name || 'Unnamed Class', 
      teacherName: cls.class_instance?.teacher 
        ? `${cls.class_instance.teacher.first_name} ${cls.class_instance.teacher.last_name}`
        : 'No Teacher',
      danceStyle: cls.class_instance?.class_definition?.dance_style?.name || 'Unknown',
      danceStyleColor: cls.class_instance?.class_definition?.dance_style?.color || '#cccccc',
      studioName: cls.studio?.name || 'No Studio',
      studioId: cls.studio?.id
    }))
    
    return {
      schedule,
      classes: formattedClasses
    }
  } catch (error) {
    console.error('Schedule API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch schedule'
    })
  }
})