import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const itemId = getRouterParam(event, 'id')
  const user = event.context.user

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    // Check if already liked
    const { data: existing } = await client
      .from('media_likes')
      .select('id')
      .eq('media_item_id', itemId)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      // Unlike - remove the like
      await client
        .from('media_likes')
        .delete()
        .eq('id', existing.id)

      return { message: 'Like removed', liked: false }
    } else {
      // Like - add the like
      await client
        .from('media_likes')
        .insert([{
          media_item_id: itemId,
          user_id: user.id,
        }])

      return { message: 'Media liked', liked: true }
    }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Failed to like media' })
  }
})
