// server/api/dashboard/index.ts
import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    
    // Fetch upcoming classes
    const { data: classes, error: classesError } = await client
      .from('schedule_classes')
      .select(`
        id, 
        start_time, 
        end_time,
        class_instance:class_instance_id (
          id,
          name,
          class_definition:class_definition_id (
            id,
            name,
            dance_style:dance_style_id (
              id,
              name
            )
          )
        ),
        studio:studio_id (name)
      `)
      .order('day_of_week')
      .order('start_time')
      .limit(5)
    
    if (classesError) throw classesError
    
    // Fetch statistics
    const [classesStats, studentsStats, teachersStats] = await Promise.all([
      client.from('class_instances').select('id', { count: 'exact' }),
      client.from('students').select('id', { count: 'exact' }).eq('status', 'active'),
      client.from('teachers').select('id', { count: 'exact' })
    ])
    
    // Format the data
    const upcomingClasses = classes.map(cls => {
      let danceStyle = 'Unknown'
      if (cls.class_instance?.class_definition?.dance_style?.name) {
        danceStyle = cls.class_instance.class_definition.dance_style.name
      }
      
      return {
        id: cls.id,
        name: cls.class_instance?.name || cls.class_instance?.class_definition?.name || 'Unnamed Class',
        start_time: cls.start_time,
        end_time: cls.end_time,
        dance_style: danceStyle,
        studio: cls.studio?.name || 'No Studio'
      }
    })
    
    return {
      upcomingClasses,
      statistics: {
        totalClasses: classesStats.count || 0,
        activeStudents: studentsStats.count || 0,
        teachers: teachersStats.count || 0
      }
    }
  } catch (error) {
    console.error('Dashboard API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch dashboard data'
    })
  }
})