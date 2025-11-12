/**
 * DELETE /api/lesson-plan-templates/[id]
 * Delete a lesson plan template
 */
import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Template ID is required'
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
