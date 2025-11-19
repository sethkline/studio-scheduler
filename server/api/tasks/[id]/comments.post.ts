import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

/**
 * Add Task Comment
 *
 * POST /api/tasks/:id/comments
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const taskId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!body.comment?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Comment is required'
    })
  }

  try {
    // Get current user (you may need to implement this)
    // For now, using a placeholder
    const user = event.context.user

    const { data: comment, error } = await client
      .from('task_comments')
      .insert([{
        task_id: taskId,
        user_id: user?.id || null,
        comment: body.comment.trim(),
      }])
      .select()
      .single()

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to add comment'
      })
    }

    return { comment }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to add comment'
    })
  }
})
