// API Endpoint: Upload attachment for a task
// Story 2.1.2: Enhanced Recital Checklist System
// Handles file upload to Supabase Storage and creates attachment record

import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const taskId = getRouterParam(event, 'id')

  if (!taskId) {
    throw createError({
      statusCode: 400,
      message: 'Task ID is required'
    })
  }

  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No file provided'
    })
  }

  const client = await getUserSupabaseClient(event)
  const user = event.context.user

  try {
    // Verify task exists
    const { data: task, error: taskError } = await client
      .from('recital_tasks')
      .select('id, recital_id')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      throw createError({
        statusCode: 404,
        message: 'Task not found'
      })
    }

    const attachments = []

    for (const file of formData) {
      if (file.name !== 'file' || !file.data || !file.filename) continue

      // Generate unique file path
      const timestamp = Date.now()
      const fileName = file.filename
      const filePath = `recital-tasks/${task.recital_id}/${taskId}/${timestamp}_${fileName}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await client.storage
        .from('recital-attachments')
        .upload(filePath, file.data, {
          contentType: file.type || 'application/octet-stream',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        continue
      }

      // Create attachment record
      const { data: attachment, error: attachmentError } = await client
        .from('recital_task_attachments')
        .insert({
          task_id: taskId,
          file_path: filePath,
          file_name: fileName,
          file_size: file.data.length,
          file_type: file.type || 'application/octet-stream',
          uploaded_by: user?.id
        })
        .select()
        .single()

      if (!attachmentError && attachment) {
        attachments.push(attachment)
      }
    }

    return {
      success: true,
      attachments
    }
  } catch (error: any) {
    console.error('Error uploading attachment:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to upload attachment'
    })
  }
})
