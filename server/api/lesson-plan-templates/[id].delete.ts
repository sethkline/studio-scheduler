/**
 * DELETE /api/lesson-plan-templates/[id]
 * Delete a lesson plan template
 */
import { getSupabaseClient } from '~/server/utils/supabase'
import { requireAuth, requirePermission } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Authenticate user
  const user = await requireAuth(event)

  // Check permission to manage templates
  requirePermission(user, 'canManageLessonTemplates')

  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')

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
      statusMessage: 'Forbidden - You can only delete your own templates'
    })
  }

  const { error } = await client
    .from('lesson_plan_templates')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete template',
      data: error
    })
  }

  return { success: true, message: 'Template deleted successfully' }
})
