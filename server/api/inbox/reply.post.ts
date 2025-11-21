/**
 * POST /api/inbox/reply
 *
 * Reply to an existing message. Automatically handles threading and
 * sets up proper email headers for conversation tracking.
 *
 * Body:
 * - message_id: ID of message being replied to (required)
 * - body: Reply body plain text (required)
 * - body_html: Reply body HTML (optional)
 * - reply_all: Include all original recipients (optional, default: false)
 * - attachments: Array of attachment file references (optional)
 *
 * REQUIRES: Authenticated user with access to the original message
 */

import { getSupabaseClient } from '../../utils/supabase'
import { enhancedEmailService } from '../../utils/emailService'
import type { ReplyToMessageRequest, Message } from '~/types/inbox'

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
    const body = await readBody<ReplyToMessageRequest>(event)

    // Validate required fields
    if (!body.message_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'message_id is required',
      })
    }

    if (!body.body || !body.body.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Body is required',
      })
    }

    // Fetch the original message
    const { data: originalMessage, error: fetchError } = await client
      .from('messages')
      .select('*')
      .eq('id', body.message_id)
      .eq('studio_id', profile.studio_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !originalMessage) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Original message not found',
      })
    }

    // Verify user has access to reply (must be sender or recipient)
    const canReply =
      originalMessage.from_address === user.id ||
      originalMessage.to_addresses.includes(user.id) ||
      originalMessage.cc_addresses?.includes(user.id) ||
      ['admin', 'staff'].includes(profile.user_role)

    if (!canReply) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to reply to this message',
      })
    }

    // Determine recipients
    let toAddresses: string[] = []
    let ccAddresses: string[] = []

    if (body.reply_all) {
      // Reply All: Include original sender and all recipients except current user
      toAddresses = [originalMessage.from_address]

      // Add all original recipients except current user
      const allRecipients = [
        ...originalMessage.to_addresses,
        ...(originalMessage.cc_addresses || []),
      ].filter((addr) => addr !== user.id && !toAddresses.includes(addr))

      ccAddresses = allRecipients
    } else {
      // Reply: Only to original sender
      toAddresses = [originalMessage.from_address]
    }

    // Build reply subject (add "Re:" if not already present)
    const subject = originalMessage.subject.match(/^Re:/i)
      ? originalMessage.subject
      : `Re: ${originalMessage.subject}`

    // Build reply body with quoted original
    const replyBody = buildReplyBody(
      body.body,
      originalMessage.from_name || originalMessage.from_address,
      originalMessage.created_at,
      originalMessage.body
    )

    const replyBodyHtml = body.body_html
      ? buildReplyBodyHtml(
          body.body_html,
          originalMessage.from_name || originalMessage.from_address,
          originalMessage.created_at,
          originalMessage.body_html || originalMessage.body
        )
      : undefined

    // Get studio info for from address
    const { data: studio } = await client
      .from('studios')
      .select('name, email')
      .eq('id', profile.studio_id)
      .single()

    const fromAddress = studio?.email || profile.email
    const fromName = studio?.name || `${profile.first_name} ${profile.last_name}`.trim()

    // Generate Message-ID for reply
    const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${fromAddress?.split('@')[1] || 'localhost'}>`

    // Create reply message record
    const { data: replyMessage, error: messageError } = await client
      .from('messages')
      .insert({
        studio_id: profile.studio_id,
        message_type: 'email',
        source: 'email_outbound',
        subject: subject,
        body: replyBody,
        body_html: replyBodyHtml || null,
        from_address: user.id,
        from_name: fromName,
        to_addresses: toAddresses,
        cc_addresses: ccAddresses.length > 0 ? ccAddresses : null,
        thread_id: originalMessage.thread_id,
        parent_message_id: originalMessage.id,
        email_message_id: messageId,
        in_reply_to: originalMessage.email_message_id,
        status: 'read',
        priority: originalMessage.priority,
        is_read: true,
        tags: originalMessage.tags || [],
        metadata: {
          sent_via_inbox: true,
          is_reply: true,
          reply_all: body.reply_all || false,
        },
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating reply message:', messageError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create reply message',
      })
    }

    // Send email via Mailgun
    const emailResult = await enhancedEmailService.sendEmail({
      to: toAddresses.join(','),
      subject: subject,
      html: replyBodyHtml || replyBody,
      text: replyBody,
      replyTo: fromAddress,
      cc: ccAddresses.length > 0 ? ccAddresses : undefined,
      tags: ['inbox', 'reply'],
      customVariables: {
        message_id: replyMessage.id,
        studio_id: profile.studio_id,
        thread_id: originalMessage.thread_id || '',
        parent_message_id: originalMessage.id,
      },
    })

    if (!emailResult.success) {
      console.error('Failed to send reply email:', emailResult.error)

      // Update message status to failed
      await client
        .from('messages')
        .update({
          status: 'archived',
          metadata: {
            ...replyMessage.metadata,
            send_error: emailResult.error,
            send_failed_at: new Date().toISOString(),
          },
        })
        .eq('id', replyMessage.id)

      throw createError({
        statusCode: 500,
        statusMessage: `Failed to send reply: ${emailResult.error}`,
      })
    }

    // Update message with Mailgun message ID
    const { data: updatedMessage } = await client
      .from('messages')
      .update({
        metadata: {
          ...replyMessage.metadata,
          mailgun_message_id: emailResult.messageId,
          sent_at: new Date().toISOString(),
        },
      })
      .eq('id', replyMessage.id)
      .select()
      .single()

    console.log('Reply sent successfully:', replyMessage.id)

    return updatedMessage || replyMessage
  } catch (error: any) {
    console.error('Error in reply.post:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error',
    })
  }
})

/**
 * Build reply body with quoted original message
 */
function buildReplyBody(
  replyText: string,
  originalSender: string,
  originalDate: string,
  originalBody: string
): string {
  const dateStr = new Date(originalDate).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  return `${replyText}

On ${dateStr}, ${originalSender} wrote:

> ${originalBody.split('\n').join('\n> ')}
`
}

/**
 * Build reply body HTML with quoted original message
 */
function buildReplyBodyHtml(
  replyHtml: string,
  originalSender: string,
  originalDate: string,
  originalBodyHtml: string
): string {
  const dateStr = new Date(originalDate).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  return `
    <div>${replyHtml}</div>
    <br>
    <div style="border-left: 3px solid #ccc; padding-left: 10px; color: #666;">
      <p><strong>On ${dateStr}, ${originalSender} wrote:</strong></p>
      ${originalBodyHtml}
    </div>
  `
}
