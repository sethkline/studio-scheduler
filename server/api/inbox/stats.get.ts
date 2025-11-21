/**
 * GET /api/inbox/stats
 *
 * Get inbox statistics including:
 * - Total messages
 * - Unread count
 * - Messages by status
 * - Messages by type
 * - Messages by priority
 * - Messages assigned to current user
 * - Average response time
 *
 * REQUIRES: Authenticated user
 */

import { getSupabaseClient } from '../../utils/supabase'
import type { InboxStats, MessageType, MessageStatus, MessagePriority } from '~/types/inbox'

export default defineEventHandler(async (event): Promise<InboxStats> => {
  try {
    const client = getSupabaseClient()

    // Get authenticated user
    const authHeader = event.headers.get('authorization')
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required',
      })
    }

    const { data: { user }, error: authError } = await client.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid authentication',
      })
    }

    // Get user's studio context
    const { data: profile } = await client
      .from('profiles')
      .select('studio_id, user_role')
      .eq('id', user.id)
      .single()

    if (!profile?.studio_id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'No studio context found',
      })
    }

    // Base query for all messages
    const baseQuery = client
      .from('messages')
      .select('*', { count: 'exact', head: false })
      .eq('studio_id', profile.studio_id)
      .is('deleted_at', null)

    // Get total messages
    const { count: totalMessages } = await baseQuery

    // Get unread count
    const { count: unreadCount } = await client
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('studio_id', profile.studio_id)
      .eq('is_read', false)
      .is('deleted_at', null)

    // Get counts by status
    const { data: statusCounts } = await client
      .from('messages')
      .select('status')
      .eq('studio_id', profile.studio_id)
      .is('deleted_at', null)

    const newCount = statusCounts?.filter(m => m.status === 'new').length || 0
    const inProgressCount = statusCounts?.filter(m => m.status === 'in_progress').length || 0
    const resolvedCount = statusCounts?.filter(m => m.status === 'resolved').length || 0

    // Get assigned to me count
    const { count: assignedToMeCount } = await client
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('studio_id', profile.studio_id)
      .eq('assigned_to', user.id)
      .is('deleted_at', null)

    // Get requires action count
    const { count: requiresActionCount } = await client
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('studio_id', profile.studio_id)
      .eq('requires_action', true)
      .is('deleted_at', null)

    // Get counts by type
    const { data: typeCounts } = await client
      .from('messages')
      .select('message_type')
      .eq('studio_id', profile.studio_id)
      .is('deleted_at', null)

    const byType: Record<MessageType, number> = {
      email: typeCounts?.filter(m => m.message_type === 'email').length || 0,
      internal: typeCounts?.filter(m => m.message_type === 'internal').length || 0,
      parent_communication: typeCounts?.filter(m => m.message_type === 'parent_communication').length || 0,
      system_notification: typeCounts?.filter(m => m.message_type === 'system_notification').length || 0,
      contact_form: typeCounts?.filter(m => m.message_type === 'contact_form').length || 0,
      sms: typeCounts?.filter(m => m.message_type === 'sms').length || 0,
    }

    // Get counts by priority
    const { data: priorityCounts } = await client
      .from('messages')
      .select('priority')
      .eq('studio_id', profile.studio_id)
      .is('deleted_at', null)

    const byPriority: Record<MessagePriority, number> = {
      low: priorityCounts?.filter(m => m.priority === 'low').length || 0,
      normal: priorityCounts?.filter(m => m.priority === 'normal').length || 0,
      high: priorityCounts?.filter(m => m.priority === 'high').length || 0,
      urgent: priorityCounts?.filter(m => m.priority === 'urgent').length || 0,
    }

    // Calculate average response time (for messages with replies in the last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentReplies } = await client
      .from('messages')
      .select('created_at, parent_message_id')
      .eq('studio_id', profile.studio_id)
      .not('parent_message_id', 'is', null)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .is('deleted_at', null)

    let avgResponseTimeHours: number | null = null

    if (recentReplies && recentReplies.length > 0) {
      const parentIds = recentReplies.map(r => r.parent_message_id).filter(Boolean)

      if (parentIds.length > 0) {
        const { data: parentMessages } = await client
          .from('messages')
          .select('id, created_at')
          .in('id', parentIds)

        if (parentMessages && parentMessages.length > 0) {
          let totalResponseTime = 0
          let validResponses = 0

          recentReplies.forEach(reply => {
            const parent = parentMessages.find(p => p.id === reply.parent_message_id)
            if (parent) {
              const responseTime = new Date(reply.created_at).getTime() - new Date(parent.created_at).getTime()
              totalResponseTime += responseTime
              validResponses++
            }
          })

          if (validResponses > 0) {
            avgResponseTimeHours = totalResponseTime / validResponses / (1000 * 60 * 60) // Convert to hours
            avgResponseTimeHours = Math.round(avgResponseTimeHours * 10) / 10 // Round to 1 decimal
          }
        }
      }
    }

    return {
      total_messages: totalMessages || 0,
      unread_count: unreadCount || 0,
      new_count: newCount,
      in_progress_count: inProgressCount,
      resolved_count: resolvedCount,
      assigned_to_me_count: assignedToMeCount || 0,
      requires_action_count: requiresActionCount || 0,
      by_type: byType,
      by_priority: byPriority,
      avg_response_time_hours: avgResponseTimeHours,
    }
  } catch (error: any) {
    console.error('Error in stats.get:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error',
    })
  }
})
