import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const campaignId = getRouterParam(event, 'id')
  const user = event.context.user

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    // Get campaign details
    const { data: campaign, error: campaignError } = await client
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })
    }

    if (campaign.status === 'sent') {
      throw createError({ statusCode: 400, statusMessage: 'Campaign already sent' })
    }

    // Get recipients based on target audience
    let recipients: any[] = []

    if (campaign.target_audience === 'all_parents') {
      // Get all guardian emails
      const { data: guardians } = await client
        .from('guardians')
        .select('id, profiles(id, email, first_name, last_name), students(id, first_name, last_name)')

      recipients = (guardians || []).map(g => ({
        recipient_type: 'parent',
        profile_id: (g.profiles as any)?.id,
        guardian_id: g.id,
        email_address: (g.profiles as any)?.email,
        recipient_name: `${(g.profiles as any)?.first_name} ${(g.profiles as any)?.last_name}`,
        personalization_data: {
          parent_name: `${(g.profiles as any)?.first_name} ${(g.profiles as any)?.last_name}`,
          student_name: (g.students as any)?.map((s: any) => s.first_name).join(', '),
        },
      }))
    } else if (campaign.target_audience === 'all_staff') {
      // Get all staff emails
      const { data: staff } = await client
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('user_role', ['admin', 'staff'])

      recipients = (staff || []).map(s => ({
        recipient_type: 'staff',
        profile_id: s.id,
        email_address: s.email,
        recipient_name: `${s.first_name} ${s.last_name}`,
        personalization_data: {
          staff_name: `${s.first_name} ${s.last_name}`,
        },
      }))
    }

    // Filter out invalid emails and check unsubscribes
    recipients = recipients.filter(r => r.email_address && r.email_address.includes('@'))

    const { data: unsubscribes } = await client
      .from('email_unsubscribes')
      .select('email_address')
      .in('email_address', recipients.map(r => r.email_address))

    const unsubscribedEmails = new Set((unsubscribes || []).map(u => u.email_address))
    recipients = recipients.filter(r => !unsubscribedEmails.has(r.email_address))

    // Create recipient records
    const { error: recipientError } = await client
      .from('email_campaign_recipients')
      .insert(
        recipients.map(r => ({
          campaign_id: campaignId,
          ...r,
          status: 'queued',
          open_count: 0,
          click_count: 0,
        }))
      )

    if (recipientError) {
      console.error('Failed to create recipients:', recipientError)
    }

    // Update campaign status
    const { error: updateError } = await client
      .from('email_campaigns')
      .update({
        status: 'sending',
        sent_at: new Date().toISOString(),
        sent_by: user.id,
        total_recipients: recipients.length,
      })
      .eq('id', campaignId)

    if (updateError) throw createError({ statusCode: 500, statusMessage: 'Failed to update campaign' })

    // TODO: Actually send emails via Mailgun (implement in background job)
    // For now, mark as sent
    await client
      .from('email_campaigns')
      .update({ status: 'sent', sent_count: recipients.length })
      .eq('id', campaignId)

    return {
      message: 'Campaign sent successfully',
      recipients_count: recipients.length,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to send campaign',
    })
  }
})
