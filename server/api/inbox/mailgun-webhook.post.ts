/**
 * POST /api/inbox/mailgun-webhook
 *
 * Mailgun inbound email webhook handler.
 * Receives and processes inbound emails sent to the studio's inbox.
 *
 * Configuration required in Mailgun:
 * - Create a route for inbox@yourdomain.com
 * - Forward to: https://yourapp.com/api/inbox/mailgun-webhook
 * - Set webhook signing key in environment: MAILGUN_WEBHOOK_SIGNING_KEY
 *
 * This endpoint:
 * 1. Verifies the Mailgun webhook signature
 * 2. Parses the inbound email data
 * 3. Creates a message record in the database
 * 4. Handles email threading (based on In-Reply-To and References headers)
 * 5. Processes attachments
 * 6. Notifies assigned staff
 */

import { getSupabaseClient } from '../../utils/supabase'
import { enhancedEmailService } from '../../utils/emailService'
import type { ProcessedInboundEmail } from '~/types/inbox'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const config = useRuntimeConfig()

    // Read the webhook body
    const body = await readBody(event)

    // Verify Mailgun signature
    const isValid = enhancedEmailService.verifyWebhookSignature(
      body.signature?.timestamp,
      body.signature?.token,
      body.signature?.signature
    )

    if (!isValid) {
      console.error('Invalid Mailgun webhook signature')
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid webhook signature',
      })
    }

    console.log('Received inbound email webhook from:', body.From)

    // Parse email data from Mailgun webhook
    const emailData: ProcessedInboundEmail = {
      from: body.From || body.sender,
      from_name: extractName(body.From),
      to: parseEmailList(body.To),
      cc: body.Cc ? parseEmailList(body.Cc) : undefined,
      subject: body.Subject || '(No Subject)',
      body_plain: body['body-plain'] || '',
      body_html: body['body-html'] || undefined,
      message_id: body['Message-Id'],
      in_reply_to: body['In-Reply-To'] || undefined,
      references: body.References || undefined,
      attachments: parseAttachments(body),
      headers: {
        from: body.From,
        to: body.To,
        cc: body.Cc,
        subject: body.Subject,
        date: body.Date,
        'message-id': body['Message-Id'],
        'in-reply-to': body['In-Reply-To'],
        references: body.References,
      },
    }

    // Determine which studio this email belongs to
    // For now, we'll use the first studio in the database
    // In production, you might parse the To address to determine the studio
    const { data: studio, error: studioError } = await client
      .from('studios')
      .select('id')
      .limit(1)
      .single()

    if (studioError || !studio) {
      console.error('No studio found for inbound email')
      throw createError({
        statusCode: 404,
        statusMessage: 'Studio not found',
      })
    }

    const studioId = studio.id

    // Check if this is a reply to an existing message (threading)
    let threadId: string | null = null
    let parentMessageId: string | null = null

    if (emailData.in_reply_to) {
      // Try to find the parent message by email_message_id
      const { data: parentMessage, error: parentError } = await client
        .from('messages')
        .select('id, thread_id')
        .eq('email_message_id', emailData.in_reply_to)
        .eq('studio_id', studioId)
        .single()

      if (!parentError && parentMessage) {
        parentMessageId = parentMessage.id
        threadId = parentMessage.thread_id
      }
    }

    // If no thread found via in_reply_to, try matching by subject
    // (strip Re:, Fwd:, etc. and match)
    if (!threadId) {
      const cleanSubject = cleanEmailSubject(emailData.subject)

      const { data: existingThread, error: threadError } = await client
        .from('message_threads')
        .select('id')
        .eq('studio_id', studioId)
        .ilike('subject', `%${cleanSubject}%`)
        .eq('status', 'active')
        .limit(1)
        .single()

      if (!threadError && existingThread) {
        threadId = existingThread.id
      }
    }

    // Create new thread if none exists
    if (!threadId) {
      const { data: newThread, error: threadError } = await client
        .from('message_threads')
        .insert({
          studio_id: studioId,
          subject: emailData.subject,
          thread_type: 'email',
          participants: [emailData.from, ...emailData.to],
          status: 'active',
          priority: 'normal',
          last_message_at: new Date().toISOString(),
          message_count: 1,
          unread_count: 1,
        })
        .select('id')
        .single()

      if (threadError) {
        console.error('Error creating thread:', threadError)
      } else if (newThread) {
        threadId = newThread.id
      }
    }

    // Create the message record
    const { data: message, error: messageError } = await client
      .from('messages')
      .insert({
        studio_id: studioId,
        message_type: 'email',
        source: 'email_inbound',
        subject: emailData.subject,
        body: emailData.body_plain,
        body_html: emailData.body_html || null,
        from_address: emailData.from,
        from_name: emailData.from_name || null,
        to_addresses: emailData.to,
        cc_addresses: emailData.cc || null,
        thread_id: threadId,
        parent_message_id: parentMessageId,
        email_message_id: emailData.message_id,
        in_reply_to: emailData.in_reply_to || null,
        email_headers: emailData.headers,
        status: 'new',
        priority: 'normal',
        is_read: false,
        requires_action: true, // Inbound emails typically require attention
        metadata: {
          mailgun_webhook: true,
          received_at: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create message',
      })
    }

    console.log('Created message:', message.id)

    // Process attachments
    if (emailData.attachments && emailData.attachments.length > 0) {
      await processInboundAttachments(
        client,
        message.id,
        studioId,
        emailData.attachments
      )
    }

    // Auto-assign to admin/staff (optional)
    // You could implement auto-assignment logic here based on rules
    // For now, we'll leave unassigned

    // TODO: Send real-time notification to staff about new inbound email

    return {
      success: true,
      message_id: message.id,
      thread_id: threadId,
    }
  } catch (error: any) {
    console.error('Error processing inbound email webhook:', error)

    // Return success to prevent Mailgun retries
    // Log the error but don't cause webhook failures
    return {
      success: true,
      error: error.message,
    }
  }
})

/**
 * Extract name from email address like "John Doe <john@example.com>"
 */
function extractName(emailString: string): string | undefined {
  if (!emailString) return undefined

  const match = emailString.match(/^(.+?)\s*<.+>$/)
  if (match) {
    return match[1].trim().replace(/^["']|["']$/g, '') // Remove quotes
  }

  return undefined
}

/**
 * Parse comma-separated email list
 */
function parseEmailList(emailString: string): string[] {
  if (!emailString) return []

  return emailString
    .split(',')
    .map((email) => {
      // Extract just the email address from "Name <email>" format
      const match = email.match(/<(.+?)>/)
      return match ? match[1].trim() : email.trim()
    })
    .filter(Boolean)
}

/**
 * Parse attachments from Mailgun webhook
 */
function parseAttachments(body: any): ProcessedInboundEmail['attachments'] {
  const attachments: ProcessedInboundEmail['attachments'] = []

  // Mailgun sends attachments as attachment-count and attachment-X fields
  const attachmentCount = parseInt(body['attachment-count'] || '0')

  for (let i = 1; i <= attachmentCount; i++) {
    const attachment = body[`attachment-${i}`]
    if (attachment) {
      attachments.push({
        filename: attachment.filename || `attachment-${i}`,
        mime_type: attachment.contentType || 'application/octet-stream',
        size: attachment.size || 0,
        url: attachment.url || '', // Mailgun provides a temporary URL
      })
    }
  }

  return attachments
}

/**
 * Clean email subject by removing Re:, Fwd:, etc. prefixes
 */
function cleanEmailSubject(subject: string): string {
  return subject
    .replace(/^(Re|Fwd|Fw):\s*/gi, '')
    .trim()
}

/**
 * Process and store attachments from inbound email
 */
async function processInboundAttachments(
  client: any,
  messageId: string,
  studioId: string,
  attachments: ProcessedInboundEmail['attachments']
) {
  try {
    for (const attachment of attachments) {
      // Download the attachment from Mailgun's temporary URL
      // and upload to Supabase Storage
      const response = await fetch(attachment.url)
      if (!response.ok) {
        console.error('Failed to download attachment:', attachment.filename)
        continue
      }

      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Generate a unique filename
      const timestamp = Date.now()
      const sanitizedFilename = attachment.filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
      const storagePath = `${studioId}/inbox/${messageId}/${timestamp}-${sanitizedFilename}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await client.storage
        .from('message-attachments')
        .upload(storagePath, buffer, {
          contentType: attachment.mime_type,
          upsert: false,
        })

      if (uploadError) {
        console.error('Error uploading attachment to storage:', uploadError)
        continue
      }

      // Create attachment record
      const { error: attachmentError } = await client
        .from('message_attachments')
        .insert({
          studio_id: studioId,
          message_id: messageId,
          filename: sanitizedFilename,
          original_filename: attachment.filename,
          storage_path: storagePath,
          storage_bucket: 'message-attachments',
          mime_type: attachment.mime_type,
          file_size: attachment.size,
          is_inline: false,
        })

      if (attachmentError) {
        console.error('Error creating attachment record:', attachmentError)
      } else {
        console.log('Stored attachment:', sanitizedFilename)
      }
    }
  } catch (error) {
    console.error('Error processing attachments:', error)
  }
}
