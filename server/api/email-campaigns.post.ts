import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody(event)
  const user = event.context.user

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const {
    recital_id,
    campaign_name,
    subject_line,
    from_name,
    from_email,
    reply_to_email,
    email_body_html,
    email_body_text,
    template_id,
    target_audience,
    filter_criteria,
    schedule_send_at,
    is_urgent = false,
  } = body

  if (!campaign_name?.trim() || !subject_line?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Campaign name and subject line are required' })
  }

  if (!email_body_html?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Email body is required' })
  }

  try {
    const { data: campaign, error } = await client
      .from('email_campaigns')
      .insert([{
        recital_id: recital_id || null,
        campaign_name: campaign_name.trim(),
        subject_line: subject_line.trim(),
        from_name: from_name || 'Dance Studio',
        from_email: from_email || 'noreply@studio.com',
        reply_to_email: reply_to_email || from_email || 'info@studio.com',
        email_body_html: email_body_html.trim(),
        email_body_text: email_body_text?.trim() || null,
        template_id: template_id || null,
        target_audience: target_audience || 'all_parents',
        filter_criteria: filter_criteria || {},
        status: schedule_send_at ? 'scheduled' : 'draft',
        schedule_send_at: schedule_send_at || null,
        total_recipients: 0,
        sent_count: 0,
        delivered_count: 0,
        opened_count: 0,
        clicked_count: 0,
        bounced_count: 0,
        failed_count: 0,
        unsubscribed_count: 0,
        has_attachments: false,
        is_urgent,
        created_by: user.id,
      }])
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to create campaign' })

    return { message: 'Campaign created successfully', campaign }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create campaign',
    })
  }
})
