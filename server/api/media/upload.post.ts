import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Get user profile to check role
  const { data: profile } = await client
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'staff'].includes(profile.user_role)) {
    throw createError({
      statusCode: 403,
      message: 'Permission denied',
    })
  }

  const formData = await readMultipartFormData(event)

  if (!formData) {
    throw createError({
      statusCode: 400,
      message: 'No form data provided',
    })
  }

  // Extract form fields
  let file: any
  let title: string | undefined
  let description: string | undefined
  let mediaType: string | undefined
  let recitalId: string | undefined
  let classInstanceId: string | undefined
  let eventDate: string | undefined
  let visibility: string = 'students_only'
  let studentIds: string[] = []

  for (const part of formData) {
    if (part.name === 'file' && part.filename) {
      file = part
    } else if (part.name === 'title') {
      title = part.data.toString()
    } else if (part.name === 'description') {
      description = part.data.toString()
    } else if (part.name === 'media_type') {
      mediaType = part.data.toString()
    } else if (part.name === 'recital_id') {
      recitalId = part.data.toString()
    } else if (part.name === 'class_instance_id') {
      classInstanceId = part.data.toString()
    } else if (part.name === 'event_date') {
      eventDate = part.data.toString()
    } else if (part.name === 'visibility') {
      visibility = part.data.toString()
    } else if (part.name === 'student_ids') {
      try {
        studentIds = JSON.parse(part.data.toString())
      } catch (e) {
        studentIds = []
      }
    }
  }

  if (!file || !title || !mediaType) {
    throw createError({
      statusCode: 400,
      message: 'File, title, and media type are required',
    })
  }

  // Generate unique file path
  const timestamp = Date.now()
  const sanitizedFilename = file.filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filePath = `${timestamp}-${sanitizedFilename}`

  // Upload file to Supabase Storage
  const { data: uploadData, error: uploadError } = await client.storage
    .from('recital-media')
    .upload(filePath, file.data, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('Error uploading file:', uploadError)
    throw createError({
      statusCode: 500,
      message: 'Failed to upload file',
    })
  }

  // Create media item record
  const { data: mediaItem, error: dbError } = await client
    .from('media_items')
    .insert({
      title,
      description,
      media_type: mediaType,
      file_path: uploadData.path,
      file_size_bytes: file.data.length,
      mime_type: file.type,
      recital_id: recitalId,
      class_instance_id: classInstanceId,
      event_date: eventDate,
      visibility,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (dbError) {
    console.error('Error creating media item:', dbError)
    // Clean up uploaded file
    await client.storage.from('recital-media').remove([uploadData.path])
    throw createError({
      statusCode: 500,
      message: 'Failed to create media item record',
    })
  }

  // Tag students if provided
  if (studentIds.length > 0) {
    const tags = studentIds.map((studentId) => ({
      media_item_id: mediaItem.id,
      student_id: studentId,
      tagged_by: user.id,
    }))

    await client.from('media_student_tags').insert(tags)
  }

  return mediaItem
})
