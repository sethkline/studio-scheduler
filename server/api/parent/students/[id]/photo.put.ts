import { getSupabaseClient } from '~/server/utils/supabase'

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

    // Delete old photo if it exists
    if (student.photo_url) {
      try {
        const urlParts = student.photo_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        await client.storage.from('student-photos').remove([fileName])
      } catch (error) {
        // Ignore errors when deleting old photo
        console.error('Error deleting old photo:', error)
      }
    }

    // Upload to Supabase Storage
    const fileExt = photoFile.filename?.split('.').pop() || 'jpg'
    const fileName = `student-${studentId}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await client.storage
      .from('student-photos')
      .upload(fileName, photoFile.data, {
        contentType: photoFile.type,
        upsert: true,
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = client.storage.from('student-photos').getPublicUrl(fileName)

    const photoUrl = urlData.publicUrl

    // Update student record
    const { data: updatedStudent, error: updateError } = await client
      .from('students')
      .update({ photo_url: photoUrl })
      .eq('id', studentId)
      .select()
      .single()

    if (updateError) throw updateError

    return {
      message: 'Photo uploaded successfully',
      photo_url: photoUrl,
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
