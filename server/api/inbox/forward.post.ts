/**
 * POST /api/inbox/forward
 *
 * Forward an existing message to new recipients.
 * Includes the original message content and optionally attachments.
 *
 * Body:
 * - message_id: ID of message being forwarded (required)
 * - to_addresses: Array of recipient emails (required)
 * - cc_addresses: Array of CC emails (optional)
 * - body_prefix: Additional text to add before forwarded content (optional)
 * - body_html_prefix: Additional HTML to add before forwarded content (optional)
 *
 * REQUIRES: Authenticated user with access to the original message
 */

import { getSupabaseClient } from '../../utils/supabase'
import { enhancedEmailService } from '../../utils/emailService'
import type { ForwardMessageRequest, Message } from '~/types/inbox'

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
    const body = await readBody<ForwardMessageRequest>(event)

    // Validate required fields
    if (!body.message_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'message_id is required',
      })
    }

    if (!body.to_addresses || body.to_addresses.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'At least one recipient is required',
      })
    }

    // Fetch the original message with attachments
    const { data: originalMessage, error: fetchError } = await client
      .from('messages')
      .select(`
        *,
        attachments:message_attachments(*)
      `)
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

    // Verify user has access to forward (must be sender or recipient)
    const canForward =
      originalMessage.from_address === user.id ||
      originalMessage.to_addresses.includes(user.id) ||
      originalMessage.cc_addresses?.includes(user.id) ||
      ['admin', 'staff'].includes(profile.user_role)

    if (!canForward) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to forward this message',
      })
    }

    // Build forward subject (add "Fwd:" if not already present)
    const subject = originalMessage.subject.match(/^Fwd:/i)
      ? originalMessage.subject
      : `Fwd: ${originalMessage.subject}`

    // Build forward body with original message
    const forwardBody = buildForwardBody(
      body.body_prefix || '',
      originalMessage.from_name || originalMessage.from_address,
      originalMessage.to_addresses.join(', '),
      originalMessage.created_at,
      originalMessage.subject,
      originalMessage.body
    )

    const forwardBodyHtml = buildForwardBodyHtml(
      body.body_html_prefix || body.body_prefix || '',
      originalMessage.from_name || originalMessage.from_address,
      originalMessage.to_addresses.join(', '),
      originalMessage.created_at,
      originalMessage.subject,
      originalMessage.body_html || originalMessage.body
    )

    // Get studio info for from address
    const { data: studio } = await client
      .from('studios')
      .select('name, email')
      .eq('id', profile.studio_id)
      .single()

    const fromAddress = studio?.email || profile.email
    const fromName = studio?.name || `${profile.first_name} ${profile.last_name}`.trim()

    // Generate Message-ID for forward
    const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${fromAddress?.split('@')[1] || 'localhost'}>`

    // Create a new thread for forwarded message (forwards start new conversations)
    const participants = [user.id, ...body.to_addresses, ...(body.cc_addresses || [])]
    const uniqueParticipants = Array.from(new Set(participants))

    const { data: newThread } = await client
      .from('message_threads')
      .insert({
        studio_id: profile.studio_id,
        subject: subject,
        thread_type: 'email',
        participants: uniqueParticipants,
        status: 'active',
        priority: originalMessage.priority,
        last_message_at: new Date().toISOString(),
        message_count: 1,
        unread_count: 0,
      })
      .select('id')
      .single()

    // Create forward message record
    const { data: forwardMessage, error: messageError } = await client
      .from('messages')
      .insert({
        studio_id: profile.studio_id,
        message_type: 'email',
        source: 'email_outbound',
        subject: subject,
        body: forwardBody,
        body_html: forwardBodyHtml || null,
        from_address: user.id,
        from_name: fromName,
        to_addresses: body.to_addresses,
        cc_addresses: body.cc_addresses || null,
        thread_id: newThread?.id || null,
        parent_message_id: null, // Forwards don't have parent in new thread
        email_message_id: messageId,
        status: 'read',
        priority: originalMessage.priority,
        is_read: true,
        tags: originalMessage.tags || [],
        metadata: {
          sent_via_inbox: true,
          is_forward: true,
          forwarded_from_message_id: originalMessage.id,
        },
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating forward message:', messageError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create forward message',
      })
    }

    // TODO: Copy attachments if needed
    // For now, we'll just reference them in the metadata

    // Send email via Mailgun
    const emailResult = await enhancedEmailService.sendEmail({
      to: body.to_addresses.join(','),
      subject: subject,
      html: forwardBodyHtml || forwardBody,
      text: forwardBody,
      replyTo: fromAddress,
      cc: body.cc_addresses,
      tags: ['inbox', 'forward'],
      customVariables: {
        message_id: forwardMessage.id,
        studio_id: profile.studio_id,
        thread_id: newThread?.id || '',
        forwarded_from: originalMessage.id,
      },
    })

    if (!emailResult.success) {
      console.error('Failed to send forward email:', emailResult.error)

      // Update message status to failed
      await client
        .from('messages')
        .update({
          status: 'archived',
          metadata: {
            ...forwardMessage.metadata,
            send_error: emailResult.error,
            send_failed_at: new Date().toISOString(),
          },
        })
        .eq('id', forwardMessage.id)

      throw createError({
        statusCode: 500,
        statusMessage: `Failed to send forward: ${emailResult.error}`,
      })
    }

    // Update message with Mailgun message ID
    const { data: updatedMessage } = await client
      .from('messages')
      .update({
        metadata: {
          ...forwardMessage.metadata,
          mailgun_message_id: emailResult.messageId,
          sent_at: new Date().toISOString(),
        },
      })
      .eq('id', forwardMessage.id)
      .select()
      .single()

    console.log('Forward sent successfully:', forwardMessage.id)

    return updatedMessage || forwardMessage
  } catch (error: any) {
    console.error('Error in forward.post:', error)
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
 * Build forward body with original message
 */
function buildForwardBody(
  prefix: string,
  originalSender: string,
  originalTo: string,
  originalDate: string,
  originalSubject: string,
  originalBody: string
): string {
  const dateStr = new Date(originalDate).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  return `${prefix ? prefix + '\n\n' : ''}---------- Forwarded message ---------
From: ${originalSender}
Date: ${dateStr}
Subject: ${originalSubject}
To: ${originalTo}

${originalBody}
`
}

/**
 * Build forward body HTML with original message
 */
function buildForwardBodyHtml(
  prefix: string,
  originalSender: string,
  originalTo: string,
  originalDate: string,
  originalSubject: string,
  originalBodyHtml: string
): string {
  const dateStr = new Date(originalDate).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  return `
    ${prefix ? `<div>${prefix}</div><br>` : ''}
    <div style="border: 1px solid #ccc; padding: 10px; background-color: #f9f9f9;">
      <p style="font-weight: bold; margin: 0 0 10px 0;">---------- Forwarded message ---------</p>
      <p style="margin: 5px 0;"><strong>From:</strong> ${originalSender}</p>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${dateStr}</p>
      <p style="margin: 5px 0;"><strong>Subject:</strong> ${originalSubject}</p>
      <p style="margin: 5px 0;"><strong>To:</strong> ${originalTo}</p>
      <br>
      <div>${originalBodyHtml}</div>
    </div>
  `
}
