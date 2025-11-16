// server/api/email/send-batch.post.ts
import { getSupabaseClient } from '../../utils/supabase'
import type { SendBatchEmailRequest } from '~/types/email'

/**
 * POST /api/email/send-batch
 * Send emails to multiple recipients (queued for processing)
 * REQUIRES: Admin or Staff role
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody<SendBatchEmailRequest>(event)

    // SECURITY: Require authentication
    const authHeader = event.headers.get('authorization')
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required',
      })
    }

    // Get and verify current user
    const { data: { user }, error: authError } = await client.auth.getUser(authHeader.replace('Bearer ', ''))

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid authentication',
      })
    }

    // SECURITY: Check user role - only admin and staff can send batch emails
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found',
      })
    }

    if (!['admin', 'staff'].includes(profile.user_role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Insufficient permissions. Admin or Staff role required to send batch emails.',
      })
    }

    const userId = user.id

    // Validate request
    if (!body.templateId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Template ID is required',
      })
    }

    if (!body.recipients || body.recipients.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'At least one recipient is required',
      })
    }

    // Check if template exists
    const { data: template, error: templateError } = await client
      .from('email_templates')
      .select('id, name')
      .eq('id', body.templateId)
      .single()

    if (templateError || !template) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Email template not found',
      })
    }

    // Generate batch ID
    const batchId = crypto.randomUUID()

    // Determine scheduled time
    const scheduledFor = body.scheduledFor
      ? new Date(body.scheduledFor)
      : new Date() // Send immediately

    // Create batch record
    const { data: batch, error: batchError } = await client
      .from('email_batches')
      .insert({
        id: batchId,
        name: body.batchName,
        description: body.description,
        template_id: body.templateId,
        total_recipients: body.recipients.length,
        status: body.scheduledFor ? 'scheduled' : 'sending',
        scheduled_for: scheduledFor.toISOString(),
        created_by: userId,
      })
      .select()
      .single()

    if (batchError) {
      console.error('Error creating email batch:', batchError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create email batch',
      })
    }

    // Queue emails for each recipient
    const queueItems = body.recipients.map((recipient) => ({
      template_id: body.templateId,
      recipient_email: recipient.email,
      recipient_name: recipient.name,
      recipient_type: recipient.type,
      recipient_id: recipient.id,
      template_data: recipient.templateData || {},
      scheduled_for: scheduledFor.toISOString(),
      priority: body.priority || 5,
      status: 'pending',
      batch_id: batchId,
      batch_name: body.batchName,
      created_by: userId,
    }))

    const { error: queueError } = await client
      .from('email_queue')
      .insert(queueItems)

    if (queueError) {
      console.error('Error queuing batch emails:', queueError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to queue batch emails',
      })
    }

    return {
      success: true,
      batch_id: batchId,
      total_queued: body.recipients.length,
      scheduled_for: scheduledFor.toISOString(),
      status: batch.status,
    }
  } catch (error: any) {
    console.error('Batch email send error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error',
    })
  }
})
