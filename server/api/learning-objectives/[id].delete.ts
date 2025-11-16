/**
 * DELETE /api/learning-objectives/[id]
 * Delete a learning objective
 */
import { getSupabaseClient } from '~/server/utils/supabase'
import { requireAuth, requirePermission } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Authenticate user
  const user = await requireAuth(event)

  // Check permission to manage learning objectives (admin/staff only)
  requirePermission(user, 'canManageLearningObjectives')

  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Learning objective ID is required'
    })
  }

  // Delete learning objective
  const { error } = await client
    .from('learning_objectives')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete learning objective',
      data: error
    })
  }

  return {
    success: true,
    message: 'Learning objective deleted successfully'
  }
})
