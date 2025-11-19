import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

/**
 * Delete a rehearsal resource
 * DELETE /api/rehearsals/resources/[id]
 *
 * This will delete the database record and attempt to delete the file from storage
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const resourceId = getRouterParam(event, 'id')

    // First, get the resource to check if it has a file to delete
    const { data: resource, error: fetchError } = await client
      .from('rehearsal_resources')
      .select('*')
      .eq('id', resourceId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Resource not found'
        })
      }
      throw fetchError
    }

    // If there's a file in storage, delete it
    if (resource.file_url && resource.file_url.includes('rehearsal-resources')) {
      // Extract file path from URL
      const urlParts = resource.file_url.split('rehearsal-resources/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]

        const { error: deleteFileError } = await client.storage
          .from('rehearsal-resources')
          .remove([filePath])

        if (deleteFileError) {
          console.error('Failed to delete file from storage:', deleteFileError)
          // Continue anyway - we still want to delete the database record
        }
      }
    }

    // Delete the database record
    const { error: deleteError } = await client
      .from('rehearsal_resources')
      .delete()
      .eq('id', resourceId)

    if (deleteError) throw deleteError

    return {
      message: 'Resource deleted successfully'
    }
  } catch (error: any) {
    console.error('Delete resource API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to delete resource'
    })
  }
})
