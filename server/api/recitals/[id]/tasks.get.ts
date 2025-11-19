import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

/**
 * Get Tasks
 *
 * GET /api/recitals/:id/tasks
 *
 * Retrieves all tasks for a recital show with summary statistics.
 *
 * @query {
 *   status?: 'not-started' | 'in-progress' | 'completed' | 'blocked' | 'cancelled'
 *   category?: string
 *   priority?: 'low' | 'medium' | 'high' | 'urgent'
 * }
 *
 * @returns {
 *   tasks: RecitalTask[]
 *   summary: TaskListSummary
 *   recital: RecitalShow
 * }
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const recitalShowId = getRouterParam(event, 'id')
  const query = getQuery(event)

  try {
    // Get recital show details
    const { data: recitalShow, error: recitalError } = await client
      .from('recital_shows')
      .select('id, name')
      .eq('id', recitalShowId)
      .single()

    if (recitalError || !recitalShow) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Recital not found'
      })
    }

    // Build tasks query
    let tasksQuery = client
      .from('recital_tasks')
      .select(`
        *,
        assigned_to_user:profiles!recital_tasks_assigned_to_user_id_fkey(id, first_name, last_name, email),
        completed_by_user:profiles!recital_tasks_completed_by_user_id_fkey(id, first_name, last_name),
        comments:task_comments(count)
      `)
      .eq('recital_show_id', recitalShowId)
      .eq('is_template', false)
      .order('created_at', { ascending: false })

    // Apply filters
    if (query.status) {
      tasksQuery = tasksQuery.eq('status', query.status)
    }

    if (query.category) {
      tasksQuery = tasksQuery.eq('category', query.category)
    }

    if (query.priority) {
      tasksQuery = tasksQuery.eq('priority', query.priority)
    }

    const { data: tasks, error: tasksError } = await tasksQuery

    if (tasksError) {
      console.error('Database error fetching tasks:', tasksError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch tasks'
      })
    }

    // Calculate summary statistics
    const today = new Date()
    const oneWeekFromNow = new Date()
    oneWeekFromNow.setDate(today.getDate() + 7)

    const allTasks = tasks || []

    const summary = {
      total_tasks: allTasks.length,
      not_started: allTasks.filter(t => t.status === 'not-started').length,
      in_progress: allTasks.filter(t => t.status === 'in-progress').length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      blocked: allTasks.filter(t => t.status === 'blocked').length,
      overdue: allTasks.filter(t =>
        t.due_date &&
        new Date(t.due_date) < today &&
        t.status !== 'completed'
      ).length,
      due_this_week: allTasks.filter(t =>
        t.due_date &&
        new Date(t.due_date) <= oneWeekFromNow &&
        new Date(t.due_date) >= today &&
        t.status !== 'completed'
      ).length,
      completion_rate: allTasks.length > 0
        ? Math.round((allTasks.filter(t => t.status === 'completed').length / allTasks.length) * 100)
        : 0,
    }

    return {
      tasks: allTasks,
      summary,
      recital: recitalShow,
    }
  } catch (error: any) {
    console.error('Error fetching tasks:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch tasks'
    })
  }
})
