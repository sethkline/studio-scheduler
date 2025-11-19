// server/api/email/webhook.post.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'
import { enhancedEmailService } from '../../utils/emailService'
import type { MailgunWebhookEvent } from '~/types/email'

/**
 * POST /api/email/webhook
 * Handle Mailgun webhook events for email tracking
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const body = await readBody<MailgunWebhookEvent>(event)

    // Verify webhook signature
    const isValid = enhancedEmailService.verifyWebhookSignature(
      body.signature.timestamp,
      body.signature.token,
      body.signature.signature
    )

    if (!isValid) {
      console.error('Invalid webhook signature')
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid webhook signature',
      })
    }

    const eventData = body['event-data']
    const mailgunMessageId = eventData.message.headers['message-id']
    const eventType = eventData.event
    const timestamp = new Date(eventData.timestamp * 1000).toISOString()

    console.log(`Received webhook event: ${eventType} for message ${mailgunMessageId}`)

    // Find the email log by Mailgun message ID
    const { data: emailLog, error: findError } = await client
      .from('email_logs')
      .select('*')
      .eq('mailgun_message_id', mailgunMessageId)
      .single()

    if (findError || !emailLog) {
      console.error('Email log not found for message:', mailgunMessageId)
      // Return success to prevent webhook retries
      return { success: true, message: 'Email log not found' }
    }

    // Update email log based on event type
    const updateData: any = {}

    switch (eventType) {
      case 'delivered':
        updateData.status = 'delivered'
        updateData.delivered_at = timestamp
        break

      case 'opened':
        updateData.status = 'delivered' // Ensure status is delivered
        if (!emailLog.opened_at) {
          updateData.opened_at = timestamp
        }
        updateData.open_count = (emailLog.open_count || 0) + 1
        break

      case 'clicked':
        if (!emailLog.clicked_at) {
          updateData.clicked_at = timestamp
        }
        updateData.click_count = (emailLog.click_count || 0) + 1
        break

      case 'failed':
      case 'bounced':
        updateData.status = eventType
        updateData.failed_at = timestamp
        updateData.error_message =
          eventData['delivery-status']?.message || 'Email delivery failed'
        break

      case 'complained':
        updateData.status = 'complained'
        // Also mark user as unsubscribed
        const { error: prefsError } = await client
          .from('email_preferences')
          .update({
            email_enabled: false,
            unsubscribed_at: timestamp,
          })
          .eq('email', emailLog.recipient_email)

        if (prefsError) {
          console.error('Error updating email preferences:', prefsError)
        }
        break

      default:
        console.log('Unhandled event type:', eventType)
        return { success: true, message: 'Event type not handled' }
    }

    // Update email log
    const { error: updateError } = await client
      .from('email_logs')
      .update(updateData)
      .eq('id', emailLog.id)

    if (updateError) {
      console.error('Error updating email log:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update email log',
      })
    }

    // Update batch statistics if this email is part of a batch
    if (emailLog.metadata?.batch_id) {
      await updateBatchStatistics(client, emailLog.metadata.batch_id)
    }

    return {
      success: true,
      message: 'Webhook processed successfully',
    }
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    // Return success to prevent webhook retries for processing errors
    return {
      success: true,
      error: error.message,
    }
  }
})

/**
 * Helper function to update batch statistics
 */
async function updateBatchStatistics(client: any, batchId: string) {
  try {
    // Get all email logs for this batch
    const { data: logs, error } = await client
      .from('email_logs')
      .select('status, open_count, click_count')
      .eq('metadata->batch_id', batchId)

    if (error || !logs) {
      console.error('Error fetching batch logs:', error)
      return
    }

    // Calculate statistics
    const stats = {
      sent_count: logs.filter((l: any) => ['sent', 'delivered', 'opened'].includes(l.status)).length,
      delivered_count: logs.filter((l: any) => ['delivered', 'opened'].includes(l.status)).length,
      failed_count: logs.filter((l: any) => ['failed', 'bounced'].includes(l.status)).length,
      opened_count: logs.filter((l: any) => l.open_count > 0).length,
      clicked_count: logs.filter((l: any) => l.click_count > 0).length,
    }

    // Update batch
    const { error: updateError } = await client
      .from('email_batches')
      .update(stats)
      .eq('id', batchId)

    if (updateError) {
      console.error('Error updating batch statistics:', updateError)
    }
  } catch (error) {
    console.error('Error in updateBatchStatistics:', error)
  }
}
