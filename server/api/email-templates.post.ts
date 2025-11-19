import { requireAuth, requireAdmin } from '~/server/utils/auth'
import { getUserSupabaseClient } from '~/server/utils/supabase'
import { getUserSupabaseClient } from 'utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdmin(event)

  const client = await getUserSupabaseClient(event)
  const body = await readBody(event)
  const user = event.context.user

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const {
    template_name,
    template_category,
    subject_line,
    body_html,
    body_text,
    available_merge_tags = [],
    preview_text,
  } = body

  if (!template_name?.trim() || !body_html?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Template name and body are required' })
  }

  try {
    const { data: template, error } = await client
      .from('email_templates')
      .insert([{
        template_name: template_name.trim(),
        template_category: template_category || 'general',
        subject_line: subject_line || template_name.trim(),
        body_html: body_html.trim(),
        body_text: body_text?.trim() || null,
        available_merge_tags,
        preview_text: preview_text?.trim() || null,
        is_system_template: false,
        is_active: true,
        created_by: user.id,
      }])
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to create template' })

    return { message: 'Template created successfully', template }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create template',
    })
  }
})
