import { requireAuth, requireAdmin } from '~/server/utils/auth'
import { getUserSupabaseClient } from '~/server/utils/supabase'
import { getUserSupabaseClient } from 'utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdmin(event)

  const client = await getUserSupabaseClient(event)
  const query = getQuery(event)

  const category = query.category as string | undefined
  const activeOnly = query.active_only === 'true'

  try {
    let templatesQuery = client
      .from('email_templates')
      .select('*')
      .order('template_name')

    if (category) {
      templatesQuery = templatesQuery.eq('template_category', category)
    }

    if (activeOnly) {
      templatesQuery = templatesQuery.eq('is_active', true)
    }

    const { data: templates, error } = await templatesQuery

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to fetch templates' })

    return { templates: templates || [] }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch templates',
    })
  }
})
