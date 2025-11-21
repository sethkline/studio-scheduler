/**
 * PATCH /api/inbox/messages/:id
 *
 * Update a message. Allows updating status, assignment, read status, flags, tags, etc.
 * Only the sender, assigned user, or admin/staff can update messages.
 *
 * Body (all optional):
 * - subject: Update subject
 * - body: Update body
 * - body_html: Update HTML body
 * - status: Update status (new, read, in_progress, resolved, archived)
 * - priority: Update priority (low, normal, high, urgent)
 * - assigned_to: Update assigned user (UUID or null)
 * - is_read: Mark as read/unread
 * - is_starred: Star/unstar
 * - requires_action: Set action required flag
 * - tags: Update tags array
 * - metadata: Update metadata object
 *
 * REQUIRES: Authenticated user with access to the message
 */

import { getSupabaseClient } from '../../../utils/supabase'
import type { UpdateMessageRequest, Message } from '~/types/inbox'

export default defineEventHandler(async (event): Promise<Message> => {
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

    // Parse request body
    const body = await readBody<UpdateMessageRequest>(event)

    // Fetch existing message to verify access
    const { data: existingMessage, error: fetchError } = await client
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .eq('studio_id', profile.studio_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingMessage) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Message not found',
      })
    }

    // Verify user has permission to update
    const isAdmin = profile.user_role === 'admin' || profile.user_role === 'staff'
    const isSender = existingMessage.from_address === user.id
    const isAssigned = existingMessage.assigned_to === user.id

    if (!isAdmin && !isSender && !isAssigned) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to update this message',
      })
    }

    // Build update object
    const updates: any = {}

    if (body.subject !== undefined) {
      updates.subject = body.subject.trim()
    }

    if (body.body !== undefined) {
      updates.body = body.body.trim()
    }

    if (body.body_html !== undefined) {
      updates.body_html = body.body_html?.trim() || null
    }

    if (body.status !== undefined) {
      updates.status = body.status
    }

    if (body.priority !== undefined) {
      updates.priority = body.priority
    }

    if (body.assigned_to !== undefined) {
      // Create assignment record if assigning
      if (body.assigned_to && body.assigned_to !== existingMessage.assigned_to) {
        await client
          .from('message_assignments')
          .insert({
            studio_id: profile.studio_id,
            message_id: messageId,
            assigned_to: body.assigned_to,
            assigned_by: user.id,
          })

        updates.assigned_to = body.assigned_to
        updates.assigned_at = new Date().toISOString()
        updates.assigned_by = user.id
      } else if (body.assigned_to === null) {
        updates.assigned_to = null
        updates.assigned_at = null
        updates.assigned_by = null
      }
    }

    if (body.is_read !== undefined) {
      updates.is_read = body.is_read

      if (body.is_read) {
        updates.read_at = new Date().toISOString()
        updates.read_by = user.id

        // Create read status record
        await client
          .from('message_read_status')
          .upsert({
            studio_id: profile.studio_id,
            message_id: messageId,
            user_id: user.id,
          })
      } else {
        // Remove read status record
        await client
          .from('message_read_status')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)

        updates.read_at = null
        updates.read_by = null
      }
    }

    if (body.is_starred !== undefined) {
      updates.is_starred = body.is_starred
    }

    if (body.requires_action !== undefined) {
      updates.requires_action = body.requires_action
    }

    if (body.tags !== undefined) {
      updates.tags = body.tags
    }

    if (body.metadata !== undefined) {
      updates.metadata = {
        ...existingMessage.metadata,
        ...body.metadata,
      }
    }

    // Apply updates
    const { data: updatedMessage, error: updateError } = await client
      .from('messages')
      .update(updates)
      .eq('id', messageId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating message:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update message',
      })
    }

    return updatedMessage
  } catch (error: any) {
    console.error('Error in messages/[id].patch:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error',
    })
  }
})
