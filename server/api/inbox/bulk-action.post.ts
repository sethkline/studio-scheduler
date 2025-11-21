/**
 * POST /api/inbox/bulk-action
 *
 * Perform bulk actions on multiple messages.
 *
 * Supported actions:
 * - mark_read: Mark messages as read
 * - mark_unread: Mark messages as unread
 * - archive: Archive messages (set status to 'archived')
 * - delete: Soft-delete messages
 * - star: Star messages
 * - unstar: Unstar messages
 * - assign: Assign messages to a user
 * - tag: Add tags to messages
 *
 * Body:
 * - message_ids: Array of message IDs
 * - action: Action to perform
 * - assigned_to: User ID (for assign action)
 * - tags: Array of tags (for tag action)
 *
 * REQUIRES: Authenticated user
 */

import { getSupabaseClient } from '../../utils/supabase'
import type { BulkMessageActionRequest } from '~/types/inbox'

export default defineEventHandler(async (event): Promise<{ success: boolean; updated_count: number }> => {
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

    // Parse request body
    const body = await readBody<BulkMessageActionRequest>(event)

    // Validate request
    if (!body.message_ids || body.message_ids.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'At least one message ID is required',
      })
    }

    if (!body.action) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Action is required',
      })
    }

    // Verify all messages exist and user has access
    const { data: messages, error: fetchError } = await client
      .from('messages')
      .select('id, from_address, assigned_to')
      .in('id', body.message_ids)
      .eq('studio_id', profile.studio_id)
      .is('deleted_at', null)

    if (fetchError || !messages || messages.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No messages found',
      })
    }

    const isAdmin = profile.user_role === 'admin' || profile.user_role === 'staff'

    // Perform bulk action based on action type
    let updateData: any = {}
    let error: any = null

    switch (body.action) {
      case 'mark_read':
        updateData = {
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: user.id,
        }

        // Create read status records
        for (const msg of messages) {
          await client
            .from('message_read_status')
            .upsert({
              studio_id: profile.studio_id,
              message_id: msg.id,
              user_id: user.id,
            })
        }
        break

      case 'mark_unread':
        updateData = {
          is_read: false,
          read_at: null,
          read_by: null,
        }

        // Remove read status records
        await client
          .from('message_read_status')
          .delete()
          .in('message_id', body.message_ids)
          .eq('user_id', user.id)
        break

      case 'archive':
        updateData = { status: 'archived' }
        break

      case 'delete':
        updateData = {
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        }
        break

      case 'star':
        updateData = { is_starred: true }
        break

      case 'unstar':
        updateData = { is_starred: false }
        break

      case 'assign':
        if (!body.assigned_to) {
          throw createError({
            statusCode: 400,
            statusMessage: 'assigned_to is required for assign action',
          })
        }

        if (!isAdmin) {
          throw createError({
            statusCode: 403,
            statusMessage: 'Only admin and staff can assign messages',
          })
        }

        updateData = {
          assigned_to: body.assigned_to,
          assigned_at: new Date().toISOString(),
          assigned_by: user.id,
        }

        // Create assignment records
        for (const msg of messages) {
          await client
            .from('message_assignments')
            .insert({
              studio_id: profile.studio_id,
              message_id: msg.id,
              assigned_to: body.assigned_to,
              assigned_by: user.id,
            })
        }
        break

      case 'tag':
        if (!body.tags || body.tags.length === 0) {
          throw createError({
            statusCode: 400,
            statusMessage: 'tags array is required for tag action',
          })
        }

        // This is more complex - need to merge existing tags with new tags
        for (const msg of messages) {
          const { data: existingMsg } = await client
            .from('messages')
            .select('tags')
            .eq('id', msg.id)
            .single()

          if (existingMsg) {
            const existingTags = existingMsg.tags || []
            const mergedTags = Array.from(new Set([...existingTags, ...body.tags]))

            await client
              .from('messages')
              .update({ tags: mergedTags })
              .eq('id', msg.id)
          }
        }

        // Return early for tag action since we handled it specially
        return {
          success: true,
          updated_count: messages.length,
        }

      default:
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid action: ${body.action}`,
        })
    }

    // Apply the update
    const { error: updateError, count } = await client
      .from('messages')
      .update(updateData)
      .in('id', body.message_ids)
      .eq('studio_id', profile.studio_id)

    if (updateError) {
      console.error('Error performing bulk action:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to perform bulk action',
      })
    }

    return {
      success: true,
      updated_count: count || 0,
    }
  } catch (error: any) {
    console.error('Error in bulk-action.post:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error',
    })
  }
})
