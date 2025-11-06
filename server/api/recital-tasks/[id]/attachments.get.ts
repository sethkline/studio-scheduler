// API Endpoint: Get attachments for a task
// Story 2.1.2: Enhanced Recital Checklist System
// Returns all attachments with signed URLs for download

import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, 'id')

  if (!taskId) {
    throw createError({
      statusCode: 400,
      message: 'Task ID is required'
    })
  }

  const client = getSupabaseClient()

  try {
    const { data: attachments, error } = await client
      .from('recital_task_attachments')
      .select(`
        *,
        profiles:uploaded_by (
          full_name,
          email
        )
      `)
      .eq('task_id', taskId)
      .order('uploaded_at', { ascending: false })

    if (error) throw error

    // Generate signed URLs for each attachment
    const attachmentsWithUrls = await Promise.all(
      (attachments || []).map(async (attachment) => {
        const { data: urlData } = await client.storage
          .from('recital-attachments')
          .createSignedUrl(attachment.file_path, 3600) // 1 hour expiry

        return {
          ...attachment,
          downloadUrl: urlData?.signedUrl || null
        }
      })
    )

    return attachmentsWithUrls
  } catch (error: any) {
    console.error('Error fetching attachments:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch attachments'
    })
  }
})
