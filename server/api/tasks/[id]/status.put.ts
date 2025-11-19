import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

/**
 * Update Task Status
 *
 * PUT /api/tasks/:id/status
 *
 * Quick endpoint to update just the task status (for checkbox toggle).
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const taskId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!body.status) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Status is required'
    })
  }

  try {
    const updateData: any = {
      status: body.status,
      updated_at: new Date().toISOString()
    }

    if (body.status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    } else {
      updateData.completed_at = null
      updateData.completed_by_user_id = null
    }

    const { data: task, error } = await client
      .from('recital_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update task status'
      })
    }

    return { task }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update task status'
    })
  }
})
