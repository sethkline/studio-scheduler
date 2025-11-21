/**
 * POST /api/inbox/attachments
 *
 * Upload an attachment for a message.
 * Stores the file in Supabase Storage and creates an attachment record.
 *
 * Body (multipart/form-data):
 * - file: File to upload (required)
 * - message_id: Message ID (required)
 * - is_inline: Whether this is an inline attachment (optional, default: false)
 * - content_id: Content-ID for inline attachments (optional)
 *
 * REQUIRES: Authenticated user who created the message
 */

import { getSupabaseClient } from '../../utils/supabase'
import type { AttachmentUploadResponse, MessageAttachment } from '~/types/inbox'

export default defineEventHandler(async (event): Promise<AttachmentUploadResponse> => {
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

    // Parse multipart form data
    const formData = await readMultipartFormData(event)

    if (!formData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No form data provided',
      })
    }

    // Extract fields from form data
    let file: any = null
    let messageId: string | null = null
    let isInline = false
    let contentId: string | null = null

    for (const part of formData) {
      if (part.name === 'file') {
        file = part
      } else if (part.name === 'message_id' && part.data) {
        messageId = part.data.toString('utf-8')
      } else if (part.name === 'is_inline' && part.data) {
        isInline = part.data.toString('utf-8') === 'true'
      } else if (part.name === 'content_id' && part.data) {
        contentId = part.data.toString('utf-8')
      }
    }

    // Validate required fields
    if (!file) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File is required',
      })
    }

    if (!messageId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'message_id is required',
      })
    }

    // Verify message exists and user has permission
    const { data: message, error: messageError } = await client
      .from('messages')
      .select('id, from_address, studio_id')
      .eq('id', messageId)
      .eq('studio_id', profile.studio_id)
      .single()

    if (messageError || !message) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Message not found',
      })
    }

    // Verify user is the sender or admin/staff
    const isAdmin = ['admin', 'staff'].includes(profile.user_role)
    const isSender = message.from_address === user.id

    if (!isAdmin && !isSender) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to add attachments to this message',
      })
    }

    // Validate file size (max 25MB)
    const maxSize = 25 * 1024 * 1024 // 25MB
    if (file.data.length > maxSize) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File size exceeds maximum allowed (25MB)',
      })
    }

    // Sanitize filename
    const originalFilename = file.filename || 'attachment'
    const sanitizedFilename = originalFilename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 255)

    // Generate storage path
    const timestamp = Date.now()
    const storagePath = `${profile.studio_id}/inbox/${messageId}/${timestamp}-${sanitizedFilename}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await client.storage
      .from('message-attachments')
      .upload(storagePath, file.data, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to upload file',
      })
    }

    // Create attachment record
    const { data: attachment, error: attachmentError } = await client
      .from('message_attachments')
      .insert({
        studio_id: profile.studio_id,
        message_id: messageId,
        filename: sanitizedFilename,
        original_filename: originalFilename,
        storage_path: storagePath,
        storage_bucket: 'message-attachments',
        mime_type: file.type || 'application/octet-stream',
        file_size: file.data.length,
        is_inline: isInline,
        content_id: contentId,
      })
      .select()
      .single()

    if (attachmentError) {
      console.error('Error creating attachment record:', attachmentError)

      // Clean up uploaded file
      await client.storage
        .from('message-attachments')
        .remove([storagePath])

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create attachment record',
      })
    }

    console.log('Attachment uploaded successfully:', attachment.id)

    // Get public URL for the attachment
    const { data: urlData } = client.storage
      .from('message-attachments')
      .getPublicUrl(storagePath)

    return {
      attachment: attachment as MessageAttachment,
      upload_url: urlData.publicUrl,
    }
  } catch (error: any) {
    console.error('Error in attachments.post:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error',
    })
  }
})
