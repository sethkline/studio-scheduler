// GET /api/media/access/[accessCode]
// Get access code details and status (for download page)

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const accessCode = event.context.params?.accessCode

  if (!accessCode) {
    throw createError({
      statusCode: 400,
      message: 'Access code is required'
    })
  }

  // Get access code with grants and media items
  const { data, error } = await client
    .from('media_access_codes')
    .select(`
      *,
      media_access_grants(
        *,
        media_item:media_items(*)
      )
    `)
    .eq('access_code', accessCode)
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 404,
      message: 'Invalid access code'
    })
  }

  const grant = data.media_access_grants?.[0]
  const maxDownloads = 5

  return {
    success: true,
    access_code: data.access_code,
    expires_at: data.expires_at,
    is_expired: data.expires_at ? new Date(data.expires_at) < new Date() : false,
    download_count: grant?.download_count || 0,
    max_downloads: maxDownloads,
    media_item: grant?.media_item || null
  }
})
