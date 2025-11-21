/**
 * GET /api/inbox/messages/:id
 *
 * Fetch a single message with full details including:
 * - Message data
 * - Thread information
 * - Attachments
 * - Assignment history
 * - Read status
 *
 * REQUIRES: Authenticated user with access to the message
 */

import { getSupabaseClient } from '../../../utils/supabase'
import type { MessageDetail } from '~/types/inbox'

export default defineEventHandler(async (event): Promise<MessageDetail> => {
  try {
    const client = getSupabaseClient()

    // Get message ID from route params
    const messageId = event.context.params?.id

    if (!messageId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Message ID is required',
      })
    }

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

    // Fetch message with thread
    const { data: message, error: messageError } = await client
      .from('messages')
      .select(`
        *,
        thread:message_threads(*)
      `)
      .eq('id', messageId)
      .eq('studio_id', profile.studio_id)
      .is('deleted_at', null)
      .single()

    if (messageError || !message) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Message not found',
      })
    }

    // Verify user has access to this message (RLS should handle this, but double-check)
    const isAdmin = profile.user_role === 'admin' || profile.user_role === 'staff'
    const isSender = message.from_address === user.id
    const isRecipient = message.to_addresses.includes(user.id)
    const isCc = message.cc_addresses?.includes(user.id) || false
    const isAssigned = message.assigned_to === user.id

    if (!isAdmin && !isSender && !isRecipient && !isCc && !isAssigned) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied to this message',
      })
    }

    // Fetch attachments
    const { data: attachments } = await client
      .from('message_attachments')
      .select('*')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true })

    // Fetch assignment history
    const { data: assignments } = await client
      .from('message_assignments')
      .select('*')
      .eq('message_id', messageId)
      .order('created_at', { ascending: false })

    // Fetch read status
    const { data: readStatus } = await client
      .from('message_read_status')
      .select('*')
      .eq('message_id', messageId)

    // Mark message as read for current user if not already read
    const hasReadStatus = readStatus?.some(rs => rs.user_id === user.id)
    if (!hasReadStatus) {
      // Create read status
      await client
        .from('message_read_status')
        .insert({
          studio_id: profile.studio_id,
          message_id: messageId,
          user_id: user.id,
        })

      // Update message read flag if current user is a recipient
      if (isRecipient || isCc || isAssigned) {
        await client
          .from('messages')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
            read_by: user.id,
          })
          .eq('id', messageId)

        message.is_read = true
        message.read_at = new Date().toISOString()
        message.read_by = user.id
      }
    }

    // Return message with full details
    return {
      ...message,
      attachments: attachments || [],
      assignments: assignments || [],
      read_status: readStatus || [],
    }
  } catch (error: any) {
    console.error('Error in messages/[id].get:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error',
    })
  }
})
