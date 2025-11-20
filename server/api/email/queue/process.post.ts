// server/api/email/queue/process.post.ts
import { getSupabaseClient } from '../../../utils/supabase'
import { enhancedEmailService } from '../../../utils/emailService'
import type { EmailTemplateData } from '~/types/email'
import { logError, logInfo } from '~/server/utils/logger'

/**
 * POST /api/email/queue/process
 * Process pending emails in the queue
 * This should be called by a cron job or manual trigger
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)
    const limit = body.limit || 50 // Process up to 50 emails at a time

    // Fetch pending emails that are due to be sent
    const now = new Date().toISOString()
    const { data: queueItems, error: fetchError } = await client
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('priority', { ascending: false })
      .order('scheduled_for', { ascending: true })
      .limit(limit)

    if (fetchError) {
      logError(new Error('Error fetching queue items'), {
        context: 'email_queue_fetch',
        error: fetchError,
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch email queue',
      })
    }

    if (!queueItems || queueItems.length === 0) {
      return {
        success: true,
        message: 'No emails to process',
        processed: 0,
      }
    }

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as { id: string; error: string }[],
    }

    // Process each queued email
    for (const item of queueItems) {
      try {
        results.processed++

        // Mark as processing
        await client
          .from('email_queue')
          .update({
            status: 'processing',
            last_attempt_at: new Date().toISOString(),
            attempts: (item.attempts || 0) + 1,
          })
          .eq('id', item.id)

        // Fetch template
        const { data: template, error: templateError } = await client
          .from('email_templates')
          .select('*')
          .eq('id', item.template_id)
          .single()

        if (templateError || !template) {
          throw new Error('Template not found')
        }

        // Get studio profile for branding
        const { data: studioProfile } = await client
          .from('studio_profile')
          .select('*')
          .single()

        // Get or create email preferences
        const { data: existingPrefs } = await client
          .from('email_preferences')
          .select('*')
          .eq('email', item.recipient_email)
          .single()

        let unsubscribeToken = existingPrefs?.unsubscribe_token

        if (!existingPrefs) {
          const { data: newPrefs } = await client
            .from('email_preferences')
            .insert({
              email: item.recipient_email,
              user_id: item.recipient_id,
            })
            .select()
            .single()

          unsubscribeToken = newPrefs?.unsubscribe_token
        }

        // Check if user has unsubscribed
        if (existingPrefs && !existingPrefs.email_enabled) {
          throw new Error('Recipient has unsubscribed')
        }

        // Prepare template data
        const templateData: EmailTemplateData = {
          studio_name: studioProfile?.name || 'Dance Studio',
          studio_logo_url: studioProfile?.logo_url,
          studio_email: studioProfile?.email,
          studio_phone: studioProfile?.phone,
          studio_website: studioProfile?.website,
          recipient_name: item.recipient_name,
          unsubscribe_token: unsubscribeToken,
          ...item.template_data,
        }

        // Send email
        const sendResult = await enhancedEmailService.sendTemplateEmail(
          template,
          item.recipient_email,
          item.recipient_name || item.recipient_email,
          templateData
        )

        // Create email log
        const logData: any = {
          template_id: template.id,
          template_slug: template.slug,
          recipient_email: item.recipient_email,
          recipient_name: item.recipient_name,
          recipient_type: item.recipient_type,
          recipient_id: item.recipient_id,
          subject: enhancedEmailService.replaceVariables(template.subject, templateData),
          html_content: enhancedEmailService.replaceVariables(template.html_content, templateData),
          text_content: enhancedEmailService.replaceVariables(template.text_content, templateData),
          sent_from: process.env.MAIL_FROM_ADDRESS || '',
          mailgun_message_id: sendResult.messageId,
          mailgun_domain: process.env.MAILGUN_DOMAIN || '',
          status: sendResult.success ? 'sent' : 'failed',
          sent_at: sendResult.success ? new Date().toISOString() : null,
          failed_at: sendResult.success ? null : new Date().toISOString(),
          error_message: sendResult.error,
          metadata: {
            ...item.metadata,
            batch_id: item.batch_id,
            queue_id: item.id,
          },
        }

        const { data: emailLog } = await client
          .from('email_logs')
          .insert(logData)
          .select()
          .single()

        if (sendResult.success) {
          // Update queue item as sent
          await client
            .from('email_queue')
            .update({
              status: 'sent',
              email_log_id: emailLog?.id,
            })
            .eq('id', item.id)

          results.sent++
        } else {
          throw new Error(sendResult.error || 'Failed to send email')
        }
      } catch (err: any) {
        logError(err, {
          context: 'email_queue_processing',
          queue_item_id: item.id,
          recipient_email: item.recipient_email,
          template_id: item.template_id,
        })
        results.failed++
        results.errors.push({
          id: item.id,
          error: err.message || 'Unknown error',
        })

        // Update queue item as failed
        const shouldRetry = (item.attempts || 0) < (item.max_attempts || 3)

        await client
          .from('email_queue')
          .update({
            status: shouldRetry ? 'pending' : 'failed',
            error_message: err.message || 'Unknown error',
          })
          .eq('id', item.id)
      }
    }

    return {
      success: true,
      message: `Processed ${results.processed} emails`,
      results,
    }
  } catch (error: any) {
    logError(error, {
      context: 'email_queue_processing_error',
    })
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process email queue',
    })
  }
})
