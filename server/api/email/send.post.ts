// server/api/email/send.post.ts
import { getSupabaseClient } from '../../utils/supabase'
import { enhancedEmailService } from '../../utils/emailService'
import type { SendEmailRequest, EmailTemplateData } from '~/types/email'

/**
 * POST /api/email/send
 * Send an email using a template or custom content
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody<SendEmailRequest>(event)

    // Get current user
    const authHeader = event.headers.get('authorization')
    let userId: string | null = null

    if (authHeader) {
      const { data: { user } } = await client.auth.getUser(authHeader.replace('Bearer ', ''))
      userId = user?.id || null
    }

    // Check if this email should be scheduled
    if (body.scheduledFor) {
      const scheduledDate = new Date(body.scheduledFor)
      if (scheduledDate > new Date()) {
        // Queue for future sending
        const { data: queueItem, error: queueError } = await client
          .from('email_queue')
          .insert({
            template_id: body.templateId,
            recipient_email: body.recipientEmail,
            recipient_name: body.recipientName,
            recipient_type: body.recipientType,
            recipient_id: body.recipientId,
            template_data: body.templateData || {},
            scheduled_for: body.scheduledFor,
            status: 'pending',
            metadata: body.metadata || {},
            created_by: userId,
          })
          .select()
          .single()

        if (queueError) {
          console.error('Error queuing email:', queueError)
          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to queue email for scheduled sending',
          })
        }

        return {
          success: true,
          queued: true,
          queue_id: queueItem.id,
          scheduled_for: body.scheduledFor,
        }
      }
    }

    // Send immediately
    let template = null
    let emailLog = null

    // Fetch template if specified
    if (body.templateId || body.templateSlug) {
      const query = body.templateId
        ? client.from('email_templates').select('*').eq('id', body.templateId)
        : client.from('email_templates').select('*').eq('slug', body.templateSlug)

      const { data, error } = await query.single()

      if (error || !data) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Email template not found',
        })
      }

      template = data
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either templateId or templateSlug is required',
      })
    }

    // Get studio profile for branding
    const { data: studioProfile } = await client
      .from('studio_profile')
      .select('*')
      .single()

    // Get or create email preferences for recipient
    const { data: existingPrefs } = await client
      .from('email_preferences')
      .select('*')
      .eq('email', body.recipientEmail)
      .single()

    let unsubscribeToken = existingPrefs?.unsubscribe_token

    if (!existingPrefs) {
      // Create preferences for new email
      const { data: newPrefs, error: prefsError } = await client
        .from('email_preferences')
        .insert({
          email: body.recipientEmail,
          user_id: body.recipientId,
        })
        .select()
        .single()

      if (!prefsError && newPrefs) {
        unsubscribeToken = newPrefs.unsubscribe_token
      }
    }

    // Check if user has unsubscribed
    if (existingPrefs && !existingPrefs.email_enabled) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Recipient has unsubscribed from emails',
      })
    }

    // Prepare template data
    const templateData: EmailTemplateData = {
      studio_name: studioProfile?.name || 'Dance Studio',
      studio_logo_url: studioProfile?.logo_url,
      studio_email: studioProfile?.email,
      studio_phone: studioProfile?.phone,
      studio_website: studioProfile?.website,
      recipient_name: body.recipientName,
      unsubscribe_token: unsubscribeToken,
      ...body.templateData,
    }

    // Send email
    const result = await enhancedEmailService.sendTemplateEmail(
      template,
      body.recipientEmail,
      body.recipientName || body.recipientEmail,
      templateData,
      {
        replyTo: body.replyTo,
        cc: body.cc,
        bcc: body.bcc,
        subjectOverride: body.subject,
      }
    )

    // Log the email
    const logData: any = {
      template_id: template.id,
      template_slug: template.slug,
      recipient_email: body.recipientEmail,
      recipient_name: body.recipientName,
      recipient_type: body.recipientType,
      recipient_id: body.recipientId,
      subject: body.subject || enhancedEmailService.replaceVariables(template.subject, templateData),
      html_content: enhancedEmailService.replaceVariables(template.html_content, templateData),
      text_content: enhancedEmailService.replaceVariables(template.text_content, templateData),
      sent_from: process.env.MAIL_FROM_ADDRESS || '',
      reply_to: body.replyTo || process.env.MAIL_REPLY_TO_ADDRESS,
      cc: body.cc?.join(','),
      bcc: body.bcc?.join(','),
      mailgun_message_id: result.messageId,
      mailgun_domain: process.env.MAILGUN_DOMAIN || '',
      status: result.success ? 'sent' : 'failed',
      sent_at: result.success ? new Date().toISOString() : null,
      failed_at: result.success ? null : new Date().toISOString(),
      error_message: result.error,
      metadata: body.metadata || {},
      sent_by: userId,
    }

    const { data: log, error: logError } = await client
      .from('email_logs')
      .insert(logData)
      .select()
      .single()

    if (logError) {
      console.error('Error creating email log:', logError)
    } else {
      emailLog = log
    }

    if (!result.success) {
      throw createError({
        statusCode: 500,
        statusMessage: result.error || 'Failed to send email',
      })
    }

    return {
      success: true,
      message_id: result.messageId,
      log_id: emailLog?.id,
    }
  } catch (error: any) {
    console.error('Email send error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error',
    })
  }
})
