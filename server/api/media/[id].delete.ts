import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
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

  if (!mediaId) {
    throw createError({
      statusCode: 400,
      message: 'Media ID is required',
    })
  }

  // Get media item to find file path
  const { data: mediaItem } = await client
    .from('media_items')
    .select('file_path, thumbnail_path')
    .eq('id', mediaId)
    .single()

  if (!mediaItem) {
    throw createError({
      statusCode: 404,
      message: 'Media item not found',
    })
  }

  // Delete from database (tags will cascade)
  const { error: dbError } = await client
    .from('media_items')
    .delete()
    .eq('id', mediaId)

  if (dbError) {
    console.error('Error deleting media item:', dbError)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete media item',
    })
  }

  // Delete files from storage
  const filesToDelete = [mediaItem.file_path]
  if (mediaItem.thumbnail_path) {
    filesToDelete.push(mediaItem.thumbnail_path)
  }

  await client.storage.from('recital-media').remove([mediaItem.file_path])

  if (mediaItem.thumbnail_path) {
    await client.storage.from('media-thumbnails').remove([mediaItem.thumbnail_path])
  }

  return { success: true }
})
