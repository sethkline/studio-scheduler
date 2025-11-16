import { getSupabaseClient } from '~/server/utils/supabase'
import sharp from 'sharp'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user
  const studentId = getRouterParam(event, 'id')

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  if (!studentId) {
    throw createError({
      statusCode: 400,
      message: 'Student ID is required',
    })
  }

  try {
    // Get guardian record for this user
    const { data: guardian, error: guardianError } = await client
      .from('guardians')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (guardianError || !guardian) {
      throw createError({
        statusCode: 404,
        message: 'Guardian profile not found',
      })
    }

    // Verify parent has access to this student
    const { data: relationship, error: relationshipError } = await client
      .from('student_guardian_relationships')
      .select('*')
      .eq('student_id', studentId)
      .eq('guardian_id', guardian.id)
      .single()

    if (relationshipError || !relationship) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to update this student',
      })
    }

    // Parse multipart form data
    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'No photo file provided',
      })
    }

    const photoFile = formData.find((field) => field.name === 'photo')
    if (!photoFile) {
      throw createError({
        statusCode: 400,
        message: 'Photo field is required',
      })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!photoFile.type || !allowedTypes.includes(photoFile.type)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid file type. Please upload a JPG, PNG, WEBP, or GIF file',
      })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (photoFile.data.length > maxSize) {
      throw createError({
        statusCode: 400,
        message: 'File size exceeds maximum of 5MB',
      })
    }

    // Get current student to check for existing photo
    const { data: student, error: studentError } = await client
      .from('students')
      .select('photo_url')
      .eq('id', studentId)
      .single()

    if (studentError) throw studentError

    // Delete old photo and thumbnail if they exist
    if (student.photo_url) {
      try {
        const urlParts = student.photo_url.split('/')
        const fileName = urlParts[urlParts.length - 1]

        // Delete both main photo and thumbnail
        const thumbFileName = fileName.replace(/(\.[^.]+)$/, '-thumb$1')
        await client.storage.from('student-photos').remove([fileName, thumbFileName])
      } catch (error) {
        // Ignore errors when deleting old photo
        console.error('Error deleting old photo:', error)
      }
    }

    // Optimize image with sharp
    const timestamp = Date.now()
    const mainFileName = `student-${studentId}-${timestamp}.jpg`
    const thumbFileName = `student-${studentId}-${timestamp}-thumb.jpg`

    // Create optimized main image (max 800x800, quality 85%)
    const optimizedImage = await sharp(photoFile.data)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toBuffer()

    // Create thumbnail (150x150, quality 80%)
    const thumbnail = await sharp(photoFile.data)
      .resize(150, 150, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toBuffer()

    // Upload both optimized image and thumbnail to Supabase Storage
    const [mainUpload, thumbUpload] = await Promise.all([
      client.storage
        .from('student-photos')
        .upload(mainFileName, optimizedImage, {
          contentType: 'image/jpeg',
          upsert: true,
        }),
      client.storage
        .from('student-photos')
        .upload(thumbFileName, thumbnail, {
          contentType: 'image/jpeg',
          upsert: true,
        })
    ])

    // Both uploads must succeed - fail atomically if either fails
    if (mainUpload.error) {
      console.error('Error uploading main photo:', mainUpload.error)
      throw createError({
        statusCode: 500,
        message: 'Failed to upload photo',
      })
    }

    if (thumbUpload.error) {
      console.error('Error uploading thumbnail:', thumbUpload.error)
      // Clean up the main photo since thumbnail failed
      await client.storage.from('student-photos').remove([mainFileName])
      throw createError({
        statusCode: 500,
        message: 'Failed to upload photo thumbnail',
      })
    }

    // Store file paths (not URLs) in database for private bucket access
    // Note: student-photos bucket should be configured as private
    // Signed URLs will be generated on-demand when photos are accessed
    const photoPath = mainFileName
    const thumbnailPath = thumbFileName

    // Update student record with file paths (only if both uploads succeeded)
    const { data: updatedStudent, error: updateError } = await client
      .from('students')
      .update({
        photo_url: photoPath,
        photo_thumbnail_url: thumbnailPath
      })
      .eq('id', studentId)
      .select()
      .single()

    if (updateError) {
      // Clean up uploaded files if database update fails
      await client.storage.from('student-photos').remove([mainFileName, thumbFileName])
      throw updateError
    }

    // Generate signed URLs for immediate response (valid for 1 hour)
    const expiresIn = 60 * 60 // 1 hour
    const [mainUrlResult, thumbUrlResult] = await Promise.all([
      client.storage.from('student-photos').createSignedUrl(photoPath, expiresIn),
      client.storage.from('student-photos').createSignedUrl(thumbnailPath, expiresIn)
    ])

    return {
      message: 'Photo uploaded and optimized successfully',
      photo_url: mainUrlResult.data?.signedUrl || '',
      thumbnail_url: thumbUrlResult.data?.signedUrl || '',
      student: updatedStudent,
    }
  } catch (error: any) {
    console.error('Error uploading student photo:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to upload photo',
    })
  }
})
