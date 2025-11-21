/**
 * DELETE /api/inbox/messages/:id
 *
 * Soft-delete a message by setting deleted_at timestamp.
 * Only the sender or admin/staff can delete messages.
 *
 * REQUIRES: Authenticated user with delete permission
 */

import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event): Promise<{ success: boolean }> => {
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

    // Fetch existing message to verify access
    const { data: existingMessage, error: fetchError } = await client
      .from('messages')
      .select('from_address')
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

    // Verify user has permission to delete
    const isAdmin = profile.user_role === 'admin' || profile.user_role === 'staff'
    const isSender = existingMessage.from_address === user.id

    if (!isAdmin && !isSender) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to delete this message',
      })
    }

    // Soft delete the message
    const { error: deleteError } = await client
      .from('messages')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', messageId)

    if (deleteError) {
      console.error('Error deleting message:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete message',
      })
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in messages/[id].delete:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error',
    })
  }
})
