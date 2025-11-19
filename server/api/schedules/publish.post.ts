import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const body = await readBody(event)
    
    // Get the authenticated user
    // const { data: { user } } = await client.auth.getUser()
    
    // if (!user) {
    //   return createError({
    //     statusCode: 401,
    //     statusMessage: 'Unauthorized'
    //   })
    // }

    let user = {
      id: 1} // for testing
    
    // Validate required parameters
    if (!body.scheduleId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required field: scheduleId'
      })
    }
    
    // Get the current schedule to determine new version number
    const { data: currentSchedule, error: fetchError } = await client
      .from('schedules')
      .select('published_version')
      .eq('id', body.scheduleId)
      .single()
    
    if (fetchError) throw fetchError
    
    // Prepare publication data
    const newVersion = (currentSchedule.published_version || 0) + 1
    const publishData = {
      publication_status: 'published',
      published_at: new Date().toISOString(),
      published_by: user.id,
      published_version: newVersion
    }
    
    // Update the schedule
    const { data, error } = await client
      .from('schedules')
      .update(publishData)
      .eq('id', body.scheduleId)
      .select()
    
    if (error) throw error
    
    // Record in publication history if notes were provided
    if (body.notes) {
      const { error: historyError } = await client
        .from('schedule_publish_history')
        .insert([{
          schedule_id: body.scheduleId,
          version: newVersion,
          published_at: publishData.published_at,
          published_by: user?.id,
          notes: body.notes
        }])
      
      if (historyError) throw historyError
    }
    
    // Send notifications if requested
    if (body.sendNotifications) {
      // Get all staff and teachers except the publisher
      const { data: staffAndTeachers, error: userError } = await client
        .from('profiles')
        .select('id')
        .in('user_role', ['admin', 'staff', 'teacher'])
        .neq('id', user.id)
      
      if (userError) throw userError
      
      // Get the schedule name
      const { data: scheduleData, error: scheduleNameError } = await client
        .from('schedules')
        .select('name')
        .eq('id', body.scheduleId)
        .single()
      
      if (scheduleNameError) throw scheduleNameError
      
      // Insert notifications for each user
      const notifications = staffAndTeachers.map(recipient => ({
        user_id: recipient.id,
        title: 'Schedule Published',
        message: `The schedule "${scheduleData.name}" has been published and is now available.`,
        link: '/schedule'
      }))
      
      if (notifications.length > 0) {
        const { error: notificationError } = await client
          .from('notifications')
          .insert(notifications)
        
        if (notificationError) throw notificationError
      }
    }
    
    return {
      success: true,
      message: 'Schedule published successfully',
      schedule: data[0]
    }
  } catch (error) {
    console.error('Publish schedule API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to publish schedule'
    })
  }
})