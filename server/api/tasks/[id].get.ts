import { getSupabaseClient } from '~/server/utils/supabase'

/**
 * Get Task
 *
 * GET /api/tasks/:id
 *
 * Retrieves a single task with all details including comments and attachments.
 *
 * @returns {
 *   task: TaskWithDetails
 * }
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
    // Fetch task with all related data
    const { data: task, error } = await client
      .from('recital_tasks')
      .select(`
        *,
        assigned_to_user:profiles!recital_tasks_assigned_to_user_id_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        completed_by_user:profiles!recital_tasks_completed_by_user_id_fkey(
          id,
          first_name,
          last_name
        ),
        comments:task_comments(
          id,
          task_id,
          user_id,
          comment,
          created_at,
          updated_at,
          user:profiles(id, first_name, last_name)
        )
      `)
      .eq('id', taskId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Task not found'
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch task'
      })
    }

    return { task }
  } catch (error: any) {
    console.error('Error fetching task:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch task'
    })
  }
})
