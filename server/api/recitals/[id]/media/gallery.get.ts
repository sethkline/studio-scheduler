// API Endpoint: Get media gallery for a recital
// Story 2.1.4: Recital Media Hub
// Returns all media items with optional filtering

import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const recitalId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const performanceId = query.performanceId as string | undefined
  const showId = query.showId as string | undefined
  const fileType = query.fileType as string | undefined

  if (!recitalId) {
    throw createError({
      statusCode: 400,
      message: 'Recital ID is required'
    })
  }

  const client = await getUserSupabaseClient(event)

  try {
    let queryBuilder = client
      .from('recital_media_with_stats')
      .select('*')
      .eq('recital_id', recitalId)
      .order('uploaded_at', { ascending: false })

    // Apply filters
    if (performanceId) {
      queryBuilder = queryBuilder.eq('performance_id', performanceId)
    }
    if (showId) {
      queryBuilder = queryBuilder.eq('show_id', showId)
    }
    if (fileType) {
      queryBuilder = queryBuilder.eq('file_type', fileType)
    }

    const { data: media, error } = await queryBuilder

    if (error) throw error

    // Get public URLs for each media item
    const mediaWithUrls = (media || []).map((item) => {
      const { data: urlData } = client.storage
        .from('recital-media')
        .getPublicUrl(item.file_path)

      return {
        ...item,
        publicUrl: urlData.publicUrl
      }
    })

    return mediaWithUrls
  } catch (error: any) {
    console.error('Error fetching media gallery:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch media gallery'
    })
  }
})
