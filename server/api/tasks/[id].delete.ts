import { getSupabaseClient } from '~/server/utils/supabase'

/**
 * Delete Task
 *
 * DELETE /api/tasks/:id
 *
 * Deletes a task.
 */
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const taskId = getRouterParam(event, 'id')

  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task ID is required'
    })
  }

  try {
    // Delete task (comments will be cascade deleted)
    const { error } = await client
      .from('recital_tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Task not found'
        })
      }
      console.error('Database error deleting task:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete task'
      })
    }

    return {
      message: 'Task deleted successfully'
    }
  } catch (error: any) {
    console.error('Error deleting task:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete task'
    })
  }
})
