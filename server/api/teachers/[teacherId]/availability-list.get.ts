// server/api/teachers/[teacherId]/availability-list.get.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const teacherId = getRouterParam(event, 'teacherId')
    const query = getQuery(event)
    
    // Get schedule_id from query (optional, default to active schedule)
    const scheduleId = query.scheduleId?.toString()
    
    // If no scheduleId is provided, find the active schedule
    let activeScheduleId = scheduleId
    if (!activeScheduleId) {
      const { data: activeSchedules, error: scheduleError } = await client
        .from('schedules')
        .select('id')
        .eq('is_active', true)
        .limit(1)
      
      if (scheduleError) throw scheduleError
      
      if (activeSchedules && activeSchedules.length > 0) {
        activeScheduleId = activeSchedules[0].id
      } else {
        // If no active schedule exists, get the most recent one
        const { data: recentSchedules, error: recentError } = await client
          .from('schedules')
          .select('id')
          .order('end_date', { ascending: false })
          .limit(1)
        
        if (recentError) throw recentError
        
        if (recentSchedules && recentSchedules.length > 0) {
          activeScheduleId = recentSchedules[0].id
        } else {
          return createError({
            statusCode: 404,
            statusMessage: 'No schedules found in the system'
          })
        }
      }
    }
    
    // Get the schedule information
    const { data: schedule, error: scheduleDataError } = await client
      .from('schedules')
      .select('*')
      .eq('id', activeScheduleId)
      .single()
    
    if (scheduleDataError) throw scheduleDataError
    
    // Get regular availability schedule
    const { data: regularAvailability, error: regularError } = await client
      .from('teacher_availability')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('schedule_id', activeScheduleId)
      .order('day_of_week')
      .order('start_time')
    
    if (regularError) throw regularError
    
    // Get availability exceptions
    const startDate = query.startDate?.toString() || schedule.start_date
    const endDate = query.endDate?.toString() || schedule.end_date
    
    const { data: exceptions, error: exceptionsError } = await client
      .from('teacher_availability_exceptions')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('schedule_id', activeScheduleId)
      .gte('exception_date', startDate)
      .lte('exception_date', endDate)
      .order('exception_date')
    
    if (exceptionsError) throw exceptionsError
    
    return {
      schedule,
      regularAvailability: regularAvailability || [],
      exceptions: exceptions || []
    }
  } catch (error) {
    console.error('Teacher availability API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch teacher availability'
    })
  }
})