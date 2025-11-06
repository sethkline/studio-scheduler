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

    // Get current student photo URLs
    const { data: student, error: studentError } = await client
      .from('students')
      .select('photo_url, photo_thumbnail_url')
      .eq('id', studentId)
      .single()

    if (studentError) throw studentError

    // Delete photo and thumbnail from storage if they exist
    const filesToDelete: string[] = []

    if (student.photo_url) {
      const urlParts = student.photo_url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      filesToDelete.push(fileName)
    }

    if (student.photo_thumbnail_url) {
      const urlParts = student.photo_thumbnail_url.split('/')
      const thumbFileName = urlParts[urlParts.length - 1]
      filesToDelete.push(thumbFileName)
    }

    if (filesToDelete.length > 0) {
      try {
        const { error: deleteError } = await client.storage
          .from('student-photos')
          .remove(filesToDelete)

        if (deleteError && !deleteError.message.includes('Object not found')) {
          throw deleteError
        }
      } catch (error) {
        console.error('Error deleting photos from storage:', error)
        // Continue even if storage delete fails
      }
    }

    // Update student record to remove photo URLs
    const { data: updatedStudent, error: updateError } = await client
      .from('students')
      .update({
        photo_url: null,
        photo_thumbnail_url: null
      })
      .eq('id', studentId)
      .select()
      .single()

    if (updateError) throw updateError

    return {
      message: 'Photo removed successfully',
      student: updatedStudent,
    }
  } catch (error: any) {
    console.error('Error removing student photo:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to remove photo',
    })
  }
})
