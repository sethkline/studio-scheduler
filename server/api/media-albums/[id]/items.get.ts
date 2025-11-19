import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const albumId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const mediaType = query.type as string | undefined

  try {
    const { data: album } = await client
      .from('media_albums')
      .select('*')
      .eq('id', albumId)
      .single()

    if (!album) {
      throw createError({ statusCode: 404, statusMessage: 'Album not found' })
    }

    let itemsQuery = client
      .from('media_items')
      .select(`
        *,
        uploader:profiles!media_items_uploaded_by_user_id_fkey(id, first_name, last_name, email),
        likes:media_likes(id, user_id),
        comments:media_comments(id)
      `)
      .eq('album_id', albumId)

    if (mediaType) {
      itemsQuery = itemsQuery.eq('media_type', mediaType)
    }

    const { data: items, error } = await itemsQuery.order('uploaded_at', { ascending: false })

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to fetch media items' })

    return { album, items: items || [] }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Failed to fetch media items' })
  }
})
