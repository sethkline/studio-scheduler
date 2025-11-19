import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

/**
 * Update Task
 *
 * PUT /api/tasks/:id
 *
 * Updates a task.
 *
 * @body {
 *   title?: string
 *   description?: string
 *   category?: string
 *   priority?: string
 *   status?: string
 *   assigned_to_user_id?: string
 *   due_date?: string
 *   estimated_hours?: number
 *   notes?: string
 * }
 *
 * @returns {
 *   message: string
 *   task: RecitalTask
 * }
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const taskId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task ID is required'
    })
  }

  // Validate fields if provided
  if (body.title !== undefined && !body.title?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task title cannot be empty'
    })
  }

  try {
    // Prepare update data (only include fields that are provided)
    const updateData: any = {}

    if (body.title !== undefined) updateData.title = body.title.trim()
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.category !== undefined) updateData.category = body.category
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.status !== undefined) {
      updateData.status = body.status
      // If marking as completed, set completed_at
      if (body.status === 'completed') {
        updateData.completed_at = new Date().toISOString()
        // You might want to get the current user ID here
        // updateData.completed_by_user_id = currentUser.id
      } else {
        updateData.completed_at = null
        updateData.completed_by_user_id = null
      }
    }
    if (body.assigned_to_user_id !== undefined) updateData.assigned_to_user_id = body.assigned_to_user_id || null
    if (body.due_date !== undefined) updateData.due_date = body.due_date || null
    if (body.estimated_hours !== undefined) updateData.estimated_hours = body.estimated_hours || null
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null

    updateData.updated_at = new Date().toISOString()

    // Update task
    const { data: task, error } = await client
      .from('recital_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Task not found'
        })
      }
      console.error('Database error updating task:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update task'
      })
    }

    return {
      message: 'Task updated successfully',
      task
    }
  } catch (error: any) {
    console.error('Error updating task:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update task'
    })
  }
})
