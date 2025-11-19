import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

/**
 * Create Task
 *
 * POST /api/recitals/:id/tasks
 *
 * Creates a new task for a recital show.
 *
 * @body {
 *   title: string
 *   description?: string
 *   category: 'venue' | 'costumes' | 'tech' | 'marketing' | 'admin' | 'rehearsal' | 'performance' | 'other'
 *   priority: 'low' | 'medium' | 'high' | 'urgent'
 *   assigned_to_user_id?: string
 *   assigned_to_role?: string
 *   due_date?: string (ISO date)
 *   parent_task_id?: string
 *   depends_on_task_id?: string
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
  const recitalShowId = getRouterParam(event, 'id')
  const body = await readBody(event)

  // Validate required fields
  if (!body.title?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task title is required'
    })
  }

  if (!body.category) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task category is required'
    })
  }

  if (!body.priority) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task priority is required'
    })
  }

  // Validate category
  const validCategories = ['venue', 'costumes', 'tech', 'marketing', 'admin', 'rehearsal', 'performance', 'other']
  if (!validCategories.includes(body.category)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Category must be one of: ${validCategories.join(', ')}`
    })
  }

  // Validate priority
  const validPriorities = ['low', 'medium', 'high', 'urgent']
  if (!validPriorities.includes(body.priority)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Priority must be one of: ${validPriorities.join(', ')}`
    })
  }

  try {
    // Prepare task data
    const taskData = {
      recital_show_id: recitalShowId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      category: body.category,
      priority: body.priority,
      status: 'not-started',
      assigned_to_user_id: body.assigned_to_user_id || null,
      assigned_to_role: body.assigned_to_role || null,
      due_date: body.due_date || null,
      parent_task_id: body.parent_task_id || null,
      depends_on_task_id: body.depends_on_task_id || null,
      estimated_hours: body.estimated_hours || null,
      notes: body.notes?.trim() || null,
      is_template: false,
    }

    // Insert task
    const { data: task, error } = await client
      .from('recital_tasks')
      .insert([taskData])
      .select()
      .single()

    if (error) {
      console.error('Database error creating task:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create task'
      })
    }

    return {
      message: 'Task created successfully',
      task
    }
  } catch (error: any) {
    console.error('Error creating task:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create task'
    })
  }
})
