import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

/**
 * Upload a resource (file or link) for a rehearsal
 * POST /api/rehearsals/[id]/resources
 *
 * For file uploads:
 * - Content-Type: multipart/form-data
 * - Fields: file, title, description, type, is_public
 *
 * For external links:
 * - Content-Type: application/json
 * - Body: { title, description, type: 'link', external_url, is_public }
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const rehearsalId = getRouterParam(event, 'id')
    const contentType = getHeader(event, 'content-type')

    let resourceData: any = {
      rehearsal_id: rehearsalId
    }

    // Handle multipart form data (file upload)
    if (contentType?.includes('multipart/form-data')) {
      const formData = await readMultipartFormData(event)

      if (!formData) {
        throw createError({
          statusCode: 400,
          statusMessage: 'No form data received'
        })
      }

      let fileData: any = null
      let fileName = ''
      let fileType = ''

      // Extract form fields
      for (const field of formData) {
        if (field.name === 'file' && field.data) {
          fileData = field.data
          fileName = field.filename || 'unnamed'
          fileType = field.type || 'application/octet-stream'
        } else if (field.name === 'title') {
          resourceData.title = field.data.toString()
        } else if (field.name === 'description') {
          resourceData.description = field.data.toString()
        } else if (field.name === 'type') {
          resourceData.resource_type = field.data.toString()
        } else if (field.name === 'is_public') {
          resourceData.is_public = field.data.toString() === 'true'
        }
      }

      if (!fileData) {
        throw createError({
          statusCode: 400,
          statusMessage: 'No file provided'
        })
      }

      // Upload file to Supabase Storage
      const filePath = `rehearsals/${rehearsalId}/${Date.now()}_${fileName}`

      const { data: uploadData, error: uploadError } = await client.storage
        .from('rehearsal-resources')
        .upload(filePath, fileData, {
          contentType: fileType,
          upsert: false
        })

      if (uploadError) {
        console.error('File upload error:', uploadError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to upload file'
        })
      }

      // Get public URL
      const { data: urlData } = client.storage
        .from('rehearsal-resources')
        .getPublicUrl(filePath)

      resourceData.file_url = urlData.publicUrl
      resourceData.file_size = fileData.length
      resourceData.file_type = fileType

    } else {
      // Handle JSON data (external link)
      const body = await readBody(event)

      resourceData.title = body.title
      resourceData.description = body.description || null
      resourceData.resource_type = body.type
      resourceData.external_url = body.external_url || null
      resourceData.is_public = body.is_public || false
    }

    // Validate required fields
    if (!resourceData.title?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Title is required'
      })
    }

    if (!resourceData.resource_type) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Resource type is required'
      })
    }

    // Insert resource record
    const { data: resource, error } = await client
      .from('rehearsal_resources')
      .insert([resourceData])
      .select()
      .single()

    if (error) throw error

    return {
      message: 'Resource uploaded successfully',
      resource
    }
  } catch (error: any) {
    console.error('Upload resource API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to upload resource'
    })
  }
})
