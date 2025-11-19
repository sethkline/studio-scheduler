import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const mediaId = getRouterParam(event, 'id')

  if (!mediaId) {
    throw createError({
      statusCode: 400,
      message: 'Media ID is required',
    })
  }

  // Get guardian ID if user is a parent
  let guardianId: string | undefined
  const { data: guardian } = await client
    .from('guardians')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (guardian) {
    guardianId = guardian.id
  }

  // Create download record
  const headers = getHeaders(event)
  const { error } = await client
    .from('media_downloads')
    .insert({
      media_item_id: mediaId,
      downloaded_by: user.id,
      guardian_id: guardianId,
      ip_address: headers['x-forwarded-for'] || headers['x-real-ip'],
      user_agent: headers['user-agent'],
    })

  if (error) {
    console.error('Error recording download:', error)
    // Don't fail the request if download tracking fails
  }

  // Increment download count
  await client.rpc('increment_download_count', { media_id: mediaId })

  // Get signed URL for download
  const { data: mediaItem } = await client
    .from('media_items')
    .select('file_path, title')
    .eq('id', mediaId)
    .single()

  if (!mediaItem) {
    throw createError({
      statusCode: 404,
      message: 'Media item not found',
    })
  }

  const { data: signedData } = await client.storage
    .from('recital-media')
    .createSignedUrl(mediaItem.file_path, 60) // 1 minute expiry for download

  if (!signedData) {
    throw createError({
      statusCode: 500,
      message: 'Failed to generate download URL',
    })
  }

  return {
    download_url: signedData.signedUrl,
    filename: mediaItem.title,
  }
})
