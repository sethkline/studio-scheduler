/**
 * PUT /api/lesson-plan-templates/[id]
 * Update a lesson plan template
 */
import { getSupabaseClient } from '~/server/utils/supabase'
import { requireAuth, requirePermission } from '~/server/utils/auth'
import type { UpdateLessonPlanTemplateInput } from '~/types/lesson-planning'

export default defineEventHandler(async (event) => {
  // Authenticate user
  const user = await requireAuth(event)

  // Check permission to manage templates
  requirePermission(user, 'canManageLessonTemplates')

  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')
  const body = await readBody<UpdateLessonPlanTemplateInput>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Template ID is required'
    })
  }

  // Fetch existing template to check ownership
  const { data: existingTemplate, error: fetchError } = await client
    .from('lesson_plan_templates')
    .select('teacher_id')
    .eq('id', id)
    .single()

  if (fetchError || !existingTemplate) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Template not found'
    })
  }

  // Check authorization
  const isAdminOrStaff = user.user_role === 'admin' || user.user_role === 'staff'
  const isOwner = existingTemplate.teacher_id === user.teacher_id

  if (!isAdminOrStaff && !isOwner) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden - You can only update your own templates'
    })
  }

  const updateData: any = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.description !== undefined) updateData.description = body.description
  if (body.dance_style_id !== undefined) updateData.dance_style_id = body.dance_style_id
  if (body.class_level_id !== undefined) updateData.class_level_id = body.class_level_id
  if (body.duration !== undefined) updateData.duration = body.duration
  if (body.content !== undefined) updateData.content = body.content
  if (body.objectives !== undefined) updateData.objectives = body.objectives
  if (body.materials_needed !== undefined) updateData.materials_needed = body.materials_needed
  if (body.warm_up !== undefined) updateData.warm_up = body.warm_up
  if (body.main_activity !== undefined) updateData.main_activity = body.main_activity
  if (body.cool_down !== undefined) updateData.cool_down = body.cool_down
  if (body.notes !== undefined) updateData.notes = body.notes
  if (body.is_public !== undefined) updateData.is_public = body.is_public

  const { data, error } = await client
    .from('lesson_plan_templates')
    .update(updateData)
    .eq('id', id)
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
      statusMessage: 'Failed to update template',
      data: error
    })
  }

  return { success: true, template: data }
})
