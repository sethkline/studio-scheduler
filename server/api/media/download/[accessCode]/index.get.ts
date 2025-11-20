// GET /api/media/download/[accessCode]
// Download digital media file using access code

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
  const { data: codeData, error: codeError } = await client
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

  if (codeError || !codeData) {
    throw createError({
      statusCode: 404,
      message: 'Invalid access code'
    })
  }

  // Check expiration
  if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
    throw createError({
      statusCode: 403,
      message: 'Access code has expired'
    })
  }

  // Get the first grant (in a real app, might need to handle multiple media items)
  const grant = codeData.media_access_grants?.[0]
  if (!grant || !grant.media_item) {
    throw createError({
      statusCode: 404,
      message: 'Media not found'
    })
  }

  // Check download limit (max 5 downloads by default)
  const maxDownloads = 5
  if (grant.download_count >= maxDownloads) {
    throw createError({
      statusCode: 403,
      message: 'Download limit reached'
    })
  }

  // Increment download count
  await client
    .from('media_access_grants')
    .update({
      download_count: grant.download_count + 1,
      accessed_at: grant.accessed_at || new Date().toISOString()
    })
    .eq('id', grant.id)

  // Log access
  const userAgent = getHeader(event, 'user-agent')
  const ipAddress = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip')

  // TODO: Create media_access_logs table for detailed tracking
  // await client.from('media_access_logs').insert({
  //   access_code_id: codeData.id,
  //   ip_address: ipAddress,
  //   user_agent: userAgent
  // })

  // Generate signed URL for file download (1 hour validity)
  const { data: signedUrlData, error: urlError } = await client.storage
    .from('media')
    .createSignedUrl(grant.media_item.file_url, 3600)

  if (urlError || !signedUrlData) {
    console.error('Error generating signed URL:', urlError)
    throw createError({
      statusCode: 500,
      message: 'Failed to generate download link'
    })
  }

  // Redirect to signed URL
  return sendRedirect(event, signedUrlData.signedUrl)
})
