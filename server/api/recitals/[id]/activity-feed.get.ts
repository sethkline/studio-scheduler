// API Endpoint: Get activity feed for a recital
// Story 2.1.1: Recital Hub Dashboard
// Returns recent activity across all recital-related tables

import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const recitalId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const limit = parseInt(query.limit as string) || 20

  if (!recitalId) {
    throw createError({
      statusCode: 400,
      message: 'Recital ID is required'
    })
  }

  const client = getSupabaseClient()

  try {
    const activities: any[] = []

    // Get task completions
    const { data: taskActivity } = await client
      .from('recital_tasks')
      .select(`
        id,
        title,
        completed_at,
        created_at,
        status,
        profiles!recital_tasks_completed_by_fkey (
          full_name
        )
      `)
      .eq('recital_id', recitalId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(limit)

    taskActivity?.forEach(task => {
      activities.push({
        id: `task-${task.id}`,
        type: 'task_completed',
        title: `Task completed: ${task.title}`,
        description: `Marked as complete`,
        timestamp: task.completed_at,
        user: task.profiles?.full_name || 'System',
        icon: 'check-circle',
        severity: 'success'
      })
    })

    // Get new task assignments
    const { data: taskAssignments } = await client
      .from('recital_tasks')
      .select(`
        id,
        title,
        created_at,
        profiles!recital_tasks_assigned_to_fkey (
          full_name
        )
      `)
      .eq('recital_id', recitalId)
      .not('assigned_to', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    taskAssignments?.forEach(task => {
      activities.push({
        id: `task-assign-${task.id}`,
        type: 'task_assigned',
        title: `Task assigned: ${task.title}`,
        description: `Assigned to ${task.profiles?.full_name}`,
        timestamp: task.created_at,
        user: 'System',
        icon: 'user-plus',
        severity: 'info'
      })
    })

    // Get volunteer signups
    const { data: volunteerSignups } = await client
      .from('volunteer_signups')
      .select(`
        id,
        created_at,
        profiles!volunteer_signups_parent_id_fkey (
          full_name
        ),
        volunteer_shifts!inner (
          id,
          role,
          recital_id
        )
      `)
      .eq('volunteer_shifts.recital_id', recitalId)
      .order('created_at', { ascending: false })
      .limit(limit)

    volunteerSignups?.forEach(signup => {
      activities.push({
        id: `volunteer-${signup.id}`,
        type: 'volunteer_signup',
        title: `New volunteer signup`,
        description: `${signup.profiles?.full_name} signed up for ${signup.volunteer_shifts?.role}`,
        timestamp: signup.created_at,
        user: signup.profiles?.full_name || 'Unknown',
        icon: 'users',
        severity: 'success'
      })
    })

    // Get ticket orders
    const { data: orders } = await client
      .from('orders')
      .select(`
        id,
        created_at,
        total_amount,
        customer_name,
        recital_shows!inner (
          id,
          recital_id,
          show_date,
          show_time
        )
      `)
      .eq('recital_shows.recital_id', recitalId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit)

    orders?.forEach(order => {
      activities.push({
        id: `order-${order.id}`,
        type: 'ticket_sale',
        title: `Ticket order placed`,
        description: `${order.customer_name} - $${order.total_amount}`,
        timestamp: order.created_at,
        user: order.customer_name,
        icon: 'ticket',
        severity: 'success'
      })
    })

    // Get media uploads (if media exists)
    const { data: mediaUploads } = await client
      .from('recital_media')
      .select(`
        id,
        uploaded_at,
        file_type,
        title,
        profiles!recital_media_uploaded_by_fkey (
          full_name
        )
      `)
      .eq('recital_id', recitalId)
      .order('uploaded_at', { ascending: false })
      .limit(limit)

    mediaUploads?.forEach(media => {
      activities.push({
        id: `media-${media.id}`,
        type: 'media_upload',
        title: `${media.file_type === 'photo' ? 'Photo' : 'Video'} uploaded`,
        description: media.title || 'Untitled',
        timestamp: media.uploaded_at,
        user: media.profiles?.full_name || 'System',
        icon: media.file_type === 'photo' ? 'image' : 'video',
        severity: 'info'
      })
    })

    // Sort all activities by timestamp
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    return {
      activities: sortedActivities,
      total: sortedActivities.length
    }
  } catch (error: any) {
    console.error('Error fetching activity feed:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch activity feed'
    })
  }
})
