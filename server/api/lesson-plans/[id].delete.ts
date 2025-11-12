/**
 * DELETE /api/lesson-plans/[id]
 * Delete a lesson plan
 */
import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Lesson plan ID is required'
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
