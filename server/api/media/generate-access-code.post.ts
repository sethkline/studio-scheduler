// POST /api/media/generate-access-code
// Generate a download access code for digital media

import type { GenerateMediaAccessInput } from '~/types/ticketing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody(event) as GenerateMediaAccessInput

  if (!body.order_id || !body.media_item_id || !body.customer_email) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: order_id, media_item_id, customer_email'
    })
  }

  // Generate unique access code
  const accessCode = generateAccessCode()

  // Set expiration (default 30 days)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + (body.expires_in_days || 30))

  // Create access code
  const { data: accessCodeData, error: codeError } = await client
    .from('media_access_codes')
    .insert({
      ticket_order_id: body.order_id,
      access_code: accessCode,
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single()

  if (codeError) {
    console.error('Error creating access code:', codeError)
    throw createError({
      statusCode: 400,
      message: codeError.message
    })
  }

  // Create access grant
  const { error: grantError } = await client
    .from('media_access_grants')
    .insert({
      access_code_id: accessCodeData.id,
      media_item_id: body.media_item_id,
      download_count: 0
    })

  if (grantError) {
    console.error('Error creating access grant:', grantError)
    throw createError({
      statusCode: 400,
      message: grantError.message
    })
  }

  // Get media item details
  const { data: mediaItem } = await client
    .from('media_items')
    .select('*')
    .eq('id', body.media_item_id)
    .single()

  // Generate download URL
  const config = useRuntimeConfig()
  const downloadUrl = `${config.public.marketingSiteUrl}/download/${accessCode}`

  // TODO: Send email with download link
  // await sendDigitalDownloadEmail(body.customer_email, {
  //   access_code: accessCode,
  //   download_url: downloadUrl,
  //   expires_at: expiresAt,
  //   max_downloads: body.max_downloads || 5,
  //   product_name: mediaItem?.name || 'Digital Download'
  // })

  return {
    success: true,
    access_code: accessCode,
    download_url: downloadUrl,
    expires_at: expiresAt.toISOString()
  }
})

function generateAccessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const length = 12
  let code = 'DL-'

  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return code
}
