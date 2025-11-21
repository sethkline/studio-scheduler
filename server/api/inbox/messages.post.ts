/**
 * POST /api/inbox/messages
 *
 * Create a new message (internal, parent communication, or system notification).
 * For email messages, use the /api/inbox/send endpoint instead.
 *
 * Body:
 * - message_type: Type of message (internal, parent_communication, system_notification)
 * - subject: Message subject
 * - body: Message body (plain text)
 * - body_html: Optional HTML body
 * - to_addresses: Array of recipient addresses/IDs
 * - cc_addresses: Optional array of CC addresses
 * - from_name: Optional sender name
 * - thread_id: Optional thread ID to add to existing thread
 * - parent_message_id: Optional parent message ID for replies
 * - priority: Optional priority (low, normal, high, urgent)
 * - tags: Optional array of tags
 * - metadata: Optional metadata object
 * - requires_action: Optional flag for action required
 *
 * REQUIRES: Authenticated user
 */

import { getSupabaseClient } from '../../utils/supabase'
import type { CreateMessageRequest, Message } from '~/types/inbox'

export default defineEventHandler(async (event): Promise<Message> => {
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
      .select('studio_id, user_role, email, first_name, last_name')
      .eq('id', user.id)
      .single()

    if (!profile?.studio_id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'No studio context found',
      })
    }

    // Parse request body
    const body = await readBody<CreateMessageRequest>(event)

    // Validate required fields
    if (!body.subject || !body.subject.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Subject is required',
      })
    }

    if (!body.body || !body.body.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Body is required',
      })
    }

    if (!body.to_addresses || body.to_addresses.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'At least one recipient is required',
      })
    }

    // Don't allow email type through this endpoint
    if (body.message_type === 'email') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Use /api/inbox/send for email messages',
      })
    }

    // Determine source based on message type
    let source = 'user'
    if (body.message_type === 'system_notification') {
      source = 'system'
    }

    // Build from_name if not provided
    const fromName = body.from_name || `${profile.first_name} ${profile.last_name}`.trim()

    // If thread_id is provided, verify it exists and user has access
    if (body.thread_id) {
      const { data: thread, error: threadError } = await client
        .from('message_threads')
        .select('id')
        .eq('id', body.thread_id)
        .eq('studio_id', profile.studio_id)
        .single()

      if (threadError || !thread) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Thread not found',
        })
      }
    }

    // Create the message
    const { data: message, error: createError } = await client
      .from('messages')
      .insert({
        studio_id: profile.studio_id,
        message_type: body.message_type,
        source,
        subject: body.subject.trim(),
        body: body.body.trim(),
        body_html: body.body_html?.trim() || null,
        from_address: user.id,
        from_name: fromName,
        to_addresses: body.to_addresses,
        cc_addresses: body.cc_addresses || null,
        bcc_addresses: body.bcc_addresses || null,
        thread_id: body.thread_id || null,
        parent_message_id: body.parent_message_id || null,
        priority: body.priority || 'normal',
        tags: body.tags || [],
        metadata: body.metadata || {},
        requires_action: body.requires_action || false,
        is_read: false, // New messages start as unread
        status: 'new',
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating message:', createError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create message',
      })
    }

    // If no thread_id was provided, create a new thread
    if (!body.thread_id) {
      const participants = [user.id, ...body.to_addresses]
      const uniqueParticipants = Array.from(new Set(participants))

      const { data: newThread, error: threadError } = await client
        .from('message_threads')
        .insert({
          studio_id: profile.studio_id,
          subject: body.subject.trim(),
          thread_type: body.message_type === 'internal' ? 'internal' :
                       body.message_type === 'parent_communication' ? 'parent_communication' :
                       'support',
          participants: uniqueParticipants,
          status: 'active',
          priority: body.priority || 'normal',
          tags: body.tags || [],
          last_message_at: message.created_at,
          message_count: 1,
          unread_count: 1,
        })
        .select()
        .single()

      if (!threadError && newThread) {
        // Update message with thread_id
        await client
          .from('messages')
          .update({ thread_id: newThread.id })
          .eq('id', message.id)

        message.thread_id = newThread.id
      }
    }

    // Create read status for sender (mark as read for sender)
    await client
      .from('message_read_status')
      .insert({
        studio_id: profile.studio_id,
        message_id: message.id,
        user_id: user.id,
      })

    // Update message is_read for sender
    await client
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString(), read_by: user.id })
      .eq('id', message.id)

    return {
      ...message,
      is_read: true,
      read_at: new Date().toISOString(),
      read_by: user.id,
    }
  } catch (error: any) {
    console.error('Error in messages.post:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error',
    })
  }
})
