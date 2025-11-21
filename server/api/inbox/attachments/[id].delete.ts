/**
 * DELETE /api/inbox/attachments/:id
 *
 * Delete an attachment.
 * Removes the file from storage and deletes the database record.
 *
 * REQUIRES: Authenticated user who owns the message or admin/staff
 */

import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event): Promise<{ success: boolean }> => {
  try {
    const client = getSupabaseClient()

    // Get attachment ID from route params
    const attachmentId = event.context.params?.id

    if (!attachmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Attachment ID is required',
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

    // Fetch attachment with message info
    const { data: attachment, error: attachmentError } = await client
      .from('message_attachments')
      .select(`
        *,
        message:messages!inner(
          id,
          from_address,
          studio_id
        )
      `)
      .eq('id', attachmentId)
      .eq('studio_id', profile.studio_id)
      .single()

    if (attachmentError || !attachment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Attachment not found',
      })
    }

    // Verify user has permission to delete
    const isAdmin = ['admin', 'staff'].includes(profile.user_role)
    const isSender = attachment.message.from_address === user.id

    if (!isAdmin && !isSender) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to delete this attachment',
      })
    }

    // Delete file from Supabase Storage
    const { error: storageError } = await client.storage
      .from(attachment.storage_bucket)
      .remove([attachment.storage_path])

    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete attachment record from database
    const { error: deleteError } = await client
      .from('message_attachments')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) {
      console.error('Error deleting attachment record:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete attachment record',
      })
    }

    console.log('Attachment deleted successfully:', attachmentId)

    return { success: true }
  } catch (error: any) {
    console.error('Error in attachments/[id].delete:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error',
    })
  }
})
