import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const query = getQuery(event)
    const includeHistory = query.includeHistory === 'true'
    
    // Fetch the schedule with all fields
    const { data, error } = await client
      .from('schedules')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    // If we need to include the publication history
    if (includeHistory && data.published_version > 0) {
      // Fetch the history records
      const { data: historyData, error: historyError } = await client
        .from('schedule_publish_history')
        .select(`
          id,
          schedule_id,
          version,
          published_at,
          published_by,
          notes,
          profiles:published_by (first_name, last_name)
        `)
        .eq('schedule_id', id)
        .order('version', { ascending: false })
      
      if (historyError) throw historyError
      
      // Add the history to the response
      return {
        ...data,
        publishHistory: historyData
      }
    }
    
    return data
  } catch (error) {
    console.error('Get schedule API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch schedule'
    })
  }
})