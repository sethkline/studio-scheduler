/**
 * POST /api/lesson-plan-templates/add
 * Create a new lesson plan template
 */
import { getSupabaseClient } from '~/server/utils/supabase'
import { requireAuth, requirePermission, requireOwnerOrAdmin } from '~/server/utils/auth'
import type { CreateLessonPlanTemplateInput } from '~/types/lesson-planning'

export default defineEventHandler(async (event) => {
  // Authenticate user
  const user = await requireAuth(event)

  // Check permission to manage templates
  requirePermission(user, 'canManageLessonTemplates')

  const client = getSupabaseClient()
  const body = await readBody<CreateLessonPlanTemplateInput>(event)

  if (!body.teacher_id || !body.name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: teacher_id, name'
    })
  }

  // Teachers can only create templates for themselves
  requireOwnerOrAdmin(user, body.teacher_id, 'templates')

  const { data, error } = await client
    .from('lesson_plan_templates')
    .insert({
      teacher_id: body.teacher_id,
      name: body.name,
      description: body.description,
      dance_style_id: body.dance_style_id,
      class_level_id: body.class_level_id,
      duration: body.duration,
      content: body.content,
      objectives: body.objectives,
      materials_needed: body.materials_needed,
      warm_up: body.warm_up,
      main_activity: body.main_activity,
      cool_down: body.cool_down,
      notes: body.notes,
      is_public: body.is_public || false
    })
    .select(\`
      *,
      teacher:teachers(id, first_name, last_name),
      dance_style:dance_styles(id, name, color),
      class_level:class_levels(id, name)
    \`)
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create template',
      data: error
    })
  }

  return { success: true, template: data }
})
