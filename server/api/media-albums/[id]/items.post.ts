import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const albumId = getRouterParam(event, 'id')
  const formData = await readMultipartFormData(event)
  const user = event.context.user

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  if (!formData) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  }

  try {
    // Get album details
    const { data: album, error: albumError } = await client
      .from('media_albums')
      .select('*')
      .eq('id', albumId)
      .single()

    if (albumError || !album) {
      throw createError({ statusCode: 404, statusMessage: 'Album not found' })
    }

    const fileField = formData.find(field => field.name === 'file')
    const titleField = formData.find(field => field.name === 'title')
    const captionField = formData.find(field => field.name === 'caption')
    const privacyField = formData.find(field => field.name === 'privacy')

    if (!fileField || !fileField.data) {
      throw createError({ statusCode: 400, statusMessage: 'File is required' })
    }

    const fileName = fileField.filename || 'upload'
    const fileType = fileField.type || 'application/octet-stream'
    const mediaType = fileType.startsWith('image/') ? 'photo' : 'video'

    // Upload to Supabase Storage
    const storagePath = `recitals/${album.recital_show_id}/media/${albumId}/${Date.now()}-${fileName}`
    const { data: uploadData, error: uploadError } = await client.storage
      .from('media')
      .upload(storagePath, fileField.data, {
        contentType: fileType,
        upsert: false,
      })

    if (uploadError) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to upload file' })
    }

    // Get public URL
    const { data: urlData } = client.storage
      .from('media')
      .getPublicUrl(storagePath)

    // Create media item record
    const { data: item, error: itemError } = await client
      .from('media_items')
      .insert([{
        album_id: albumId,
        recital_show_id: album.recital_show_id,
        media_type: mediaType,
        file_url: urlData.publicUrl,
        title: titleField?.data.toString() || null,
        caption: captionField?.data.toString() || null,
        privacy: privacyField?.data.toString() || album.privacy,
        file_size_bytes: fileField.data.length,
        uploaded_by_user_id: user.id,
      }])
      .select()
      .single()

    if (itemError) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to create media item' })
    }

    // Update album counts
    const countField = mediaType === 'photo' ? 'photo_count' : 'video_count'
    await client
      .from('media_albums')
      .update({ [countField]: album[countField] + 1 })
      .eq('id', albumId)

    return { message: 'Media uploaded successfully', item }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Failed to upload media' })
  }
})
