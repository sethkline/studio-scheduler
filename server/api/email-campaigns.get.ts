import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const query = getQuery(event)

  const recitalId = query.recital_id as string | undefined
  const status = query.status as string | undefined

  try {
    let campaignsQuery = client
      .from('email_campaigns')
      .select(`
        *,
        template:email_templates(id, template_name),
        creator:profiles!email_campaigns_created_by_fkey(id, first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })

    if (recitalId) {
      campaignsQuery = campaignsQuery.eq('recital_id', recitalId)
    }

    if (status) {
      campaignsQuery = campaignsQuery.eq('status', status)
    }

    const { data: campaigns, error } = await campaignsQuery

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to fetch campaigns' })

    return { campaigns: campaigns || [] }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch campaigns',
    })
  }
})
