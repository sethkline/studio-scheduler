import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const teacherId = getRouterParam(event, 'teacherId')
    const query = getQuery(event)
    
    // Parse date range
    const startDate = query.startDate?.toString() || new Date().toISOString().slice(0, 10)
    const endDate = query.endDate?.toString() || new Date(
      new Date().setDate(new Date().getDate() + 30)
    ).toISOString().slice(0, 10)
    
    // Fetch scheduled classes for this teacher
    const { data: scheduledClasses, error: scheduledClassesError } = await client
      .from('schedule_classes')
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        class_instance:class_instance_id (
          id,
          name,
          class_definition:class_definition_id (
            id,
            name,
            duration,
            dance_style:dance_style_id (
              id,
              name,
              color
            )
          )
        ),
        studio:studio_id (id, name)
      `)
      .eq('teacher_id', teacherId)
      .order('day_of_week')
      .order('start_time')
    
    if (scheduledClassesError) throw scheduledClassesError
    
    // Calculate workload summary
    const workloadSummary = calculateWorkloadSummary(scheduledClasses || [])
    
    // Get upcoming classes for teacher (limited to 10)
    const today = new Date()
    const dayOfWeek = today.getDay()
    const currentTime = today.toTimeString().slice(0, 8)
    
    // First, get today's remaining classes
    const { data: todayClasses, error: todayClassesError } = await client
      .from('schedule_classes')
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        class_instance:class_instance_id (id, name),
        studio:studio_id (id, name)
      `)
      .eq('teacher_id', teacherId)
      .eq('day_of_week', dayOfWeek)
      .gt('start_time', currentTime)
      .order('start_time')
      .limit(5)
    
    if (todayClassesError) throw todayClassesError
    
    // Then, get future days' classes (up to 5 more)
    const limit = 10 - (todayClasses?.length || 0)
    
    let futureClasses = []
    if (limit > 0) {
      const { data: futureDaysClasses, error: futureDaysClassesError } = await client
        .from('schedule_classes')
        .select(`
          id,
          day_of_week,
          start_time,
          end_time,
          class_instance:class_instance_id (id, name),
          studio:studio_id (id, name)
        `)
        .eq('teacher_id', teacherId)
        .gt('day_of_week', dayOfWeek)
        .order('day_of_week')
        .order('start_time')
        .limit(limit)
      
      if (futureDaysClassesError) throw futureDaysClassesError
      
      futureClasses = futureDaysClasses || []
    }
    
    const upcomingClasses = [...(todayClasses || []), ...futureClasses]
    
    return {
      scheduledClasses,
      workloadSummary,
      upcomingClasses
    }
  } catch (error) {
    console.error('Teacher workload API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch teacher workload'
    })
  }
})

// Helper function to calculate workload summary
function calculateWorkloadSummary(classes) {
  const summary = {
    totalHours: 0,
    classesByDay: {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0},
    hoursByDay: {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0},
    classesByStyle: {},
    hoursByStyle: {}
  }
  
  // Process each class
  classes.forEach(classItem => {
    // Get the day of week
    const dayOfWeek = classItem.day_of_week
    
    // Get the dance style
    const danceStyle = classItem.class_instance?.class_definition?.dance_style?.name || 'Unknown'
    
    // Calculate hours for this class
    const startTime = new Date(`2000-01-01T${classItem.start_time}`)
    const endTime = new Date(`2000-01-01T${classItem.end_time}`)
    const classHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
    
    // Increment total hours
    summary.totalHours += classHours
    
    // Increment classes and hours by day
    summary.classesByDay[dayOfWeek] = (summary.classesByDay[dayOfWeek] || 0) + 1
    summary.hoursByDay[dayOfWeek] = (summary.hoursByDay[dayOfWeek] || 0) + classHours
    
    // Increment classes and hours by style
    summary.classesByStyle[danceStyle] = (summary.classesByStyle[danceStyle] || 0) + 1
    summary.hoursByStyle[danceStyle] = (summary.hoursByStyle[danceStyle] || 0) + classHours
  })
  
  return summary
}

// Add this to the useApiService.ts file
// Inside the useApiService function

// Include in return object