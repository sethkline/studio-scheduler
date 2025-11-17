// API Endpoint: Clone tasks from another recital
// Story 2.1.2: Enhanced Recital Checklist System
// Copies all tasks from a previous recital with adjusted due dates

import { getSupabaseClient } from '~/server/utils/supabase'

interface CloneTasksRequest {
  sourceRecitalId: string
  targetRecitalId: string
  adjustDueDates?: boolean
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CloneTasksRequest>(event)

  if (!body.sourceRecitalId || !body.targetRecitalId) {
    throw createError({
      statusCode: 400,
      message: 'Source and target recital IDs are required'
    })
  }

  const client = getSupabaseClient()

  try {
    // Get source recital date
    const { data: sourceRecital } = await client
      .from('recitals')
      .select('date')
      .eq('id', body.sourceRecitalId)
      .single()

    // Get target recital date
    const { data: targetRecital } = await client
      .from('recitals')
      .select('date')
      .eq('id', body.targetRecitalId)
      .single()

    if (!sourceRecital || !targetRecital) {
      throw createError({
        statusCode: 404,
        message: 'Source or target recital not found'
      })
    }

    // Get all tasks from source recital
    const { data: sourceTasks, error: tasksError } = await client
      .from('recital_tasks')
      .select('*')
      .eq('recital_id', body.sourceRecitalId)

    if (tasksError) throw tasksError

    if (!sourceTasks || sourceTasks.length === 0) {
      return {
        success: true,
        tasksCloned: 0,
        message: 'No tasks found in source recital'
      }
    }

    // Calculate date offset if adjusting due dates
    const dateOffset = body.adjustDueDates
      ? new Date(targetRecital.date).getTime() - new Date(sourceRecital.date).getTime()
      : 0

    // Clone tasks
    const tasksToInsert = sourceTasks.map((task) => {
      const newTask: any = {
        recital_id: body.targetRecitalId,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        status: 'pending', // Reset status
        notes: task.notes
      }

      // Adjust due date if requested
      if (task.due_date && body.adjustDueDates && dateOffset !== 0) {
        const newDueDate = new Date(new Date(task.due_date).getTime() + dateOffset)
        newTask.due_date = newDueDate.toISOString()
      } else if (task.due_date) {
        newTask.due_date = task.due_date
      }

      // Don't copy assigned_to, completed_at, completed_by - these should start fresh
      return newTask
    })

    const { data: clonedTasks, error: insertError } = await client
      .from('recital_tasks')
      .insert(tasksToInsert)
      .select()

    if (insertError) throw insertError

    return {
      success: true,
      tasksCloned: clonedTasks?.length || 0,
      tasks: clonedTasks
    }
  } catch (error: any) {
    console.error('Error cloning tasks:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to clone tasks'
    })
  }
})
