import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const recitalShowId = getRouterParam(event, 'id')

  try {
    const { data: recital } = await client
      .from('recital_shows')
      .select('id, name')
      .eq('id', recitalShowId)
      .single()

    const { data: albums, error } = await client
      .from('media_albums')
      .select(`
        *,
        creator:profiles!media_albums_created_by_user_id_fkey(id, first_name, last_name, email)
      `)
      .eq('recital_show_id', recitalShowId)
      .order('created_at', { ascending: false })

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to fetch albums' })

    const summary = {
      total_albums: albums?.length || 0,
      total_photos: albums?.reduce((sum, a) => sum + a.photo_count, 0) || 0,
      total_videos: albums?.reduce((sum, a) => sum + a.video_count, 0) || 0,
      total_items: albums?.reduce((sum, a) => sum + a.photo_count + a.video_count, 0) || 0,
      featured_albums: albums?.filter(a => a.is_featured).length || 0,
      public_albums: albums?.filter(a => a.privacy === 'public').length || 0,
    }

    return { albums: albums || [], summary, recital }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Failed to fetch albums' })
  }
})
