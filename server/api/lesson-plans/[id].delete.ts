/**
 * DELETE /api/lesson-plans/[id]
 * Delete a lesson plan
 */
import { getSupabaseClient } from '~/server/utils/supabase'
import { requireAuth, requirePermission } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Authenticate user
  const user = await requireAuth(event)

  // Check permission to manage lesson plans
  requirePermission(user, 'canManageLessonPlans')

  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Lesson plan ID is required'
    })
  }

  // First, fetch the existing lesson plan to check ownership
  const { data: existingPlan, error: fetchError } = await client
    .from('lesson_plans')
    .select('teacher_id')
    .eq('id', id)
    .single()

  if (fetchError || !existingPlan) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Lesson plan not found'
    })
  }

  // Check authorization: teachers can only delete their own lessons, admin/staff can delete all
  const isAdminOrStaff = user.user_role === 'admin' || user.user_role === 'staff'
  const isOwner = existingPlan.teacher_id === user.teacher_id

  if (!isAdminOrStaff && !isOwner) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden - You can only delete your own lesson plans'
    })
  }

  // Delete lesson plan (cascades to objectives, shares, and attachments)
  const { error } = await client
    .from('lesson_plans')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete lesson plan',
      data: error
    })
  }

  return {
    success: true,
    message: 'Lesson plan deleted successfully'
  }
})
