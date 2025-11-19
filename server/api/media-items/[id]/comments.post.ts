import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const itemId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const user = event.context.user

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  if (!body.comment?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Comment is required' })
  }

  try {
    const { data: comment, error } = await client
      .from('media_comments')
      .insert([{
        media_item_id: itemId,
        user_id: user.id,
        comment: body.comment.trim(),
      }])
      .select(`
        *,
        user:profiles!media_comments_user_id_fkey(id, first_name, last_name, email)
      `)
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to add comment' })

    return { message: 'Comment added successfully', comment }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Failed to add comment' })
  }
})
