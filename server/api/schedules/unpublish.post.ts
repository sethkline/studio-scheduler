import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)
    
    // Get the authenticated user
    const { data: { user } } = await client.auth.getUser()
    
    if (!user) {
      return createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }
    
    // Validate required parameters
    if (!body.scheduleId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required field: scheduleId'
      })
    }
    
    // Update the schedule to revision status
    const { data, error } = await client
      .from('schedules')
      .update({
        publication_status: 'revision'
      })
      .eq('id', body.scheduleId)
      .select()
    
    if (error) throw error
    
    // Add to publication history if notes were provided
    if (body.notes) {
      // Get current version
      const currentVersion = data[0].published_version || 0
      
      const { error: historyError } = await client
        .from('schedule_publish_history')
        .insert([{
          schedule_id: body.scheduleId,
          version: currentVersion,
          published_at: new Date().toISOString(),
          published_by: user.id,
          notes: `Unpublished: ${body.notes}`
        }])
      
      if (historyError) throw historyError
    }
    
    return {
      success: true,
      message: 'Schedule unpublished successfully',
      schedule: data[0]
    }
  } catch (error) {
    console.error('Unpublish schedule API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to unpublish schedule'
    })
  }
})