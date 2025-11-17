// API Endpoint: Upload media files for a recital
// Story 2.1.4: Recital Media Hub
// Handles bulk upload of photos/videos to Supabase Storage

import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const recitalId = getRouterParam(event, 'id')
  const user = event.context.user

  if (!recitalId) {
    throw createError({
      statusCode: 400,
      message: 'Recital ID is required'
    })
  }

  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No files provided'
    })
  }

  const client = getSupabaseClient()

  try {
    // Verify recital exists
    const { data: recital, error: recitalError } = await client
      .from('recitals')
      .select('id, name')
      .eq('id', recitalId)
      .single()

    if (recitalError || !recital) {
      throw createError({
        statusCode: 404,
        message: 'Recital not found'
      })
    }

    const uploadedMedia = []

    for (const file of formData) {
      if (file.name !== 'file' || !file.data || !file.filename) continue

      // Determine file type
      const fileType = file.type?.startsWith('image/') ? 'photo' : 'video'

      // Generate unique file path
      const timestamp = Date.now()
      const sanitizedFilename = file.filename.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `recitals/${recitalId}/media/${timestamp}_${sanitizedFilename}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await client.storage
        .from('recital-media')
        .upload(filePath, file.data, {
          contentType: file.type || 'application/octet-stream',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        continue
      }

      // Get public URL
      const { data: urlData } = client.storage
        .from('recital-media')
        .getPublicUrl(filePath)

      // Create media record
      const { data: media, error: mediaError } = await client
        .from('recital_media')
        .insert({
          recital_id: recitalId,
          file_path: filePath,
          file_type: fileType,
          file_size: file.data.length,
          uploaded_by: user?.id,
          is_public: false
        })
        .select()
        .single()

      if (!mediaError && media) {
        uploadedMedia.push({
          ...media,
          publicUrl: urlData.publicUrl
        })
      }
    }

    return {
      success: true,
      uploaded: uploadedMedia.length,
      media: uploadedMedia
    }
  } catch (error: any) {
    console.error('Error uploading media:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to upload media'
    })
  }
})
