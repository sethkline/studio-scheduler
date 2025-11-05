import { getSupabaseClient } from '~/server/utils/supabase'
import type { UpdateMediaForm } from '~/types/media'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Get user profile to check role
  const { data: profile } = await client
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'staff'].includes(profile.user_role)) {
    throw createError({
      statusCode: 403,
      message: 'Permission denied',
    })
  }

  const mediaId = getRouterParam(event, 'id')
  const body = await readBody<UpdateMediaForm>(event)

  if (!mediaId) {
    throw createError({
      statusCode: 400,
      message: 'Media ID is required',
    })
  }

  const updateData: any = {}

  if (body.title !== undefined) updateData.title = body.title
  if (body.description !== undefined) updateData.description = body.description
  if (body.visibility !== undefined) updateData.visibility = body.visibility
  if (body.recital_id !== undefined) updateData.recital_id = body.recital_id
  if (body.class_instance_id !== undefined) updateData.class_instance_id = body.class_instance_id
  if (body.event_date !== undefined) updateData.event_date = body.event_date

  const { data: mediaItem, error } = await client
    .from('media_items')
    .update(updateData)
    .eq('id', mediaId)
    .select()
    .single()

  if (error) {
    console.error('Error updating media item:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update media item',
    })
  }

  return mediaItem
})
