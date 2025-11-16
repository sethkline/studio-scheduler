import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const itemId = getRouterParam(event, 'id')
  const user = event.context.user

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    // Get item details
    const { data: item, error: itemError } = await client
      .from('media_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (itemError || !item) {
      throw createError({ statusCode: 404, statusMessage: 'Media item not found' })
    }

    // Delete from storage
    const urlParts = item.file_url.split('/media/')
    if (urlParts.length > 1) {
      await client.storage.from('media').remove([urlParts[1]])
    }

    // Delete from database
    const { error: deleteError } = await client
      .from('media_items')
      .delete()
      .eq('id', itemId)

    if (deleteError) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to delete media item' })
    }

    // Update album counts
    const countField = item.media_type === 'photo' ? 'photo_count' : 'video_count'
    const { data: album } = await client
      .from('media_albums')
      .select(countField)
      .eq('id', item.album_id)
      .single()

    if (album) {
      await client
        .from('media_albums')
        .update({ [countField]: Math.max(0, album[countField] - 1) })
        .eq('id', item.album_id)
    }

    return { message: 'Media item deleted successfully' }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Failed to delete media item' })
  }
})
