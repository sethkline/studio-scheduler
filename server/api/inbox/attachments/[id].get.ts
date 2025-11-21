/**
 * GET /api/inbox/attachments/:id/download
 *
 * Download an attachment.
 * Returns the file blob with appropriate headers.
 *
 * REQUIRES: Authenticated user with access to the message
 */

import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
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
          to_addresses,
          cc_addresses,
          assigned_to,
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

    // Verify user has access to the message
    const isAdmin = ['admin', 'staff'].includes(profile.user_role)
    const isSender = attachment.message.from_address === user.id
    const isRecipient = attachment.message.to_addresses.includes(user.id)
    const isCc = attachment.message.cc_addresses?.includes(user.id) || false
    const isAssigned = attachment.message.assigned_to === user.id

    if (!isAdmin && !isSender && !isRecipient && !isCc && !isAssigned) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied to this attachment',
      })
    }

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await client.storage
      .from(attachment.storage_bucket)
      .download(attachment.storage_path)

    if (downloadError || !fileData) {
      console.error('Error downloading file from storage:', downloadError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to download file',
      })
    }

    // Update download tracking
    await client
      .from('message_attachments')
      .update({
        download_count: attachment.download_count + 1,
        last_downloaded_at: new Date().toISOString(),
      })
      .eq('id', attachmentId)

    // Set response headers
    setResponseHeaders(event, {
      'Content-Type': attachment.mime_type,
      'Content-Disposition': `attachment; filename="${attachment.original_filename}"`,
      'Content-Length': attachment.file_size.toString(),
    })

    // Return the file
    return fileData
  } catch (error: any) {
    console.error('Error in attachments/[id].get:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error',
    })
  }
})
