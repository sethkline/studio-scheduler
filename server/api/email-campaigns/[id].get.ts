import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const campaignId = getRouterParam(event, 'id')

  try {
    const { data: campaign, error } = await client
      .from('email_campaigns')
      .select(`
        *,
        template:email_templates(id, template_name, template_category),
        creator:profiles!email_campaigns_created_by_fkey(id, first_name, last_name, email),
        sender:profiles!email_campaigns_sent_by_fkey(id, first_name, last_name, email),
        recipients:email_campaign_recipients(count)
      `)
      .eq('id', campaignId)
      .single()

    if (error) throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })

    // Calculate analytics
    const analytics = {
      campaign_id: campaign.id,
      total_recipients: campaign.total_recipients,
      sent_count: campaign.sent_count,
      delivered_count: campaign.delivered_count,
      opened_count: campaign.opened_count,
      clicked_count: campaign.clicked_count,
      bounced_count: campaign.bounced_count,
      failed_count: campaign.failed_count,
      unsubscribed_count: campaign.unsubscribed_count,
      delivery_rate: campaign.sent_count > 0 ? (campaign.delivered_count / campaign.sent_count) * 100 : 0,
      open_rate: campaign.delivered_count > 0 ? (campaign.opened_count / campaign.delivered_count) * 100 : 0,
      click_rate: campaign.opened_count > 0 ? (campaign.clicked_count / campaign.opened_count) * 100 : 0,
      bounce_rate: campaign.sent_count > 0 ? (campaign.bounced_count / campaign.sent_count) * 100 : 0,
    }

    return { campaign, analytics }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch campaign',
    })
  }
})
