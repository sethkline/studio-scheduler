import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const teacherId = getRouterParam(event, 'teacherId')
    
    // Get regular availability schedule
    const { data: regularAvailability, error: regularError } = await client
      .from('teacher_availability')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('day_of_week')
      .order('start_time')
    
    if (regularError) throw regularError
    
    // Get availability exceptions
    const query = getQuery(event)
    const startDate = query.startDate?.toString() || new Date().toISOString().slice(0, 10)
    const endDate = query.endDate?.toString() || new Date(
      new Date().setDate(new Date().getDate() + 30)
    ).toISOString().slice(0, 10)
    
    const { data: exceptions, error: exceptionsError } = await client
      .from('teacher_availability_exceptions')
      .select('*')
      .eq('teacher_id', teacherId)
      .gte('exception_date', startDate)
      .lte('exception_date', endDate)
      .order('exception_date')
    
    if (exceptionsError) throw exceptionsError
    
    return {
      regularAvailability,
      exceptions
    }
  } catch (error) {
    console.error('Teacher availability API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch teacher availability'
    })
  }
})