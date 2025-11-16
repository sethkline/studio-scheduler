import { getSupabaseClient } from '~/server/utils/supabase'

/**
 * Get Task Templates
 *
 * GET /api/task-templates
 *
 * Returns all available task templates with their items.
 */
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()

  try {
    const { data: templates, error } = await client
      .from('task_templates')
      .select(`
        *,
        items:task_template_items(*)
      `)
      .eq('is_public', true)
      .order('name', { ascending: true })

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch task templates'
      })
    }

    return { templates: templates || [] }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch task templates'
    })
  }
})
