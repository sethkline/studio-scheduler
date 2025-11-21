/**
 * POST /api/inbox/send
 *
 * Send an email via the unified inbox.
 * Supports threading, templates, attachments, and scheduling.
 *
 * Body:
 * - to_addresses: Array of recipient email addresses (required)
 * - subject: Email subject (required)
 * - body: Plain text body (required)
 * - body_html: HTML body (optional)
 * - cc_addresses: CC recipients (optional)
 * - bcc_addresses: BCC recipients (optional)
 * - from_name: Sender name override (optional)
 * - template_id: Email template ID (optional)
 * - template_data: Template variable data (optional)
 * - thread_id: Existing thread ID (optional)
 * - in_reply_to: Email message ID being replied to (optional)
 * - priority: Message priority (optional)
 * - tags: Array of tags (optional)
 * - requires_action: Flag for action required (optional)
 * - scheduled_for: Schedule send for later (ISO date string, optional)
 *
 * REQUIRES: Authenticated user (admin, staff, or teacher)
 */

import { getSupabaseClient } from '../../utils/supabase'
import { enhancedEmailService } from '../../utils/emailService'
import type { SendInboxEmailRequest, Message } from '~/types/inbox'

export default defineEventHandler(async (event): Promise<Message> => {
  try {
    const client = getSupabaseClient()
    const config = useRuntimeConfig()

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

    // Check permissions - only admin, staff, or teacher can send emails
    if (!['admin', 'staff', 'teacher'].includes(profile.user_role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Insufficient permissions to send emails',
      })
    }

    // Parse request body
    const body = await readBody<SendInboxEmailRequest>(event)

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

    // Get studio info for from address
    const { data: studio } = await client
      .from('studios')
      .select('name, email')
      .eq('id', profile.studio_id)
      .single()

    const fromAddress = studio?.email || config.public.marketingSiteUrl.replace('https://', 'noreply@')
    const fromName = body.from_name || studio?.name || `${profile.first_name} ${profile.last_name}`.trim()

    // If template_id is provided, fetch and render template
    let subject = body.subject
    let htmlBody = body.body_html
    let textBody = body.body

    if (body.template_id) {
      const { data: template, error: templateError } = await client
        .from('inbox_email_templates')
        .select('*')
        .eq('id', body.template_id)
        .eq('studio_id', profile.studio_id)
        .eq('is_active', true)
        .single()

      if (templateError || !template) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Template not found',
        })
      }

      // Replace variables in template
      const templateData = body.template_data || {}
      subject = enhancedEmailService.replaceVariables(template.subject_template, templateData)
      textBody = enhancedEmailService.replaceVariables(template.body_template, templateData)

      if (template.body_html_template) {
        htmlBody = enhancedEmailService.replaceVariables(template.body_html_template, templateData)
      }
    }

    // Generate a unique Message-ID for this email
    const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${fromAddress.split('@')[1]}>`

    // Determine thread_id and parent_message_id
    let threadId = body.thread_id || null
    let parentMessageId: string | null = null
    let inReplyTo: string | null = body.in_reply_to || null

    // If in_reply_to is provided, find the parent message
    if (body.in_reply_to) {
      const { data: parentMessage } = await client
        .from('messages')
        .select('id, thread_id, email_message_id')
        .eq('email_message_id', body.in_reply_to)
        .eq('studio_id', profile.studio_id)
        .single()

      if (parentMessage) {
        parentMessageId = parentMessage.id
        threadId = parentMessage.thread_id
        inReplyTo = parentMessage.email_message_id
      }
    }

    // Create thread if none exists
    if (!threadId) {
      const participants = [user.id, ...body.to_addresses]
      const uniqueParticipants = Array.from(new Set(participants))

      const { data: newThread, error: threadError } = await client
        .from('message_threads')
        .insert({
          studio_id: profile.studio_id,
          subject: subject,
          thread_type: 'email',
          participants: uniqueParticipants,
          status: 'active',
          priority: body.priority || 'normal',
          tags: body.tags || [],
          last_message_at: new Date().toISOString(),
          message_count: 1,
          unread_count: 0, // Sender doesn't count as unread
        })
        .select('id')
        .single()

      if (!threadError && newThread) {
        threadId = newThread.id
      }
    }

    // Create message record BEFORE sending
    const { data: message, error: messageError } = await client
      .from('messages')
      .insert({
        studio_id: profile.studio_id,
        message_type: 'email',
        source: 'email_outbound',
        subject: subject,
        body: textBody,
        body_html: htmlBody || null,
        from_address: user.id, // Store user ID for internal tracking
        from_name: fromName,
        to_addresses: body.to_addresses,
        cc_addresses: body.cc_addresses || null,
        bcc_addresses: body.bcc_addresses || null,
        thread_id: threadId,
        parent_message_id: parentMessageId,
        email_message_id: messageId,
        in_reply_to: inReplyTo,
        status: 'read', // Outbound emails start as "read" by sender
        priority: body.priority || 'normal',
        is_read: true,
        is_starred: false,
        requires_action: false,
        tags: body.tags || [],
        metadata: {
          template_id: body.template_id || null,
          sent_via_inbox: true,
          scheduled_for: body.scheduled_for || null,
        },
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating message record:', messageError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create message record',
      })
    }

    // Send email via Mailgun
    const emailResult = await enhancedEmailService.sendEmail({
      to: body.to_addresses.join(','),
      subject: subject,
      html: htmlBody || textBody,
      text: textBody,
      replyTo: fromAddress,
      cc: body.cc_addresses,
      bcc: body.bcc_addresses,
      tags: ['inbox', ...(body.tags || [])],
      customVariables: {
        message_id: message.id,
        studio_id: profile.studio_id,
        thread_id: threadId || '',
      },
    })

    if (!emailResult.success) {
      console.error('Failed to send email via Mailgun:', emailResult.error)

      // Update message status to failed
      await client
        .from('messages')
        .update({
          status: 'archived',
          metadata: {
            ...message.metadata,
            send_error: emailResult.error,
            send_failed_at: new Date().toISOString(),
          },
        })
        .eq('id', message.id)

      throw createError({
        statusCode: 500,
        statusMessage: `Failed to send email: ${emailResult.error}`,
      })
    }

    // Update message with Mailgun message ID
    const { data: updatedMessage } = await client
      .from('messages')
      .update({
        metadata: {
          ...message.metadata,
          mailgun_message_id: emailResult.messageId,
          sent_at: new Date().toISOString(),
        },
      })
      .eq('id', message.id)
      .select()
      .single()

    console.log('Email sent successfully:', message.id, 'Mailgun ID:', emailResult.messageId)

    return updatedMessage || message
  } catch (error: any) {
    console.error('Error in send.post:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error',
    })
  }
})
