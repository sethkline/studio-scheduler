import { getSupabaseClient } from '~/server/utils/supabase'
import type { UpdateRecitalTaskForm } from '~/types/volunteers'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Get user profile to check role
  const { data: profile } = await client
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'staff'].includes(profile.user_role)) {
    throw createError({
      statusCode: 403,
      message: 'Permission denied',
    })
  }

  const taskId = getRouterParam(event, 'id')
  const body = await readBody<UpdateRecitalTaskForm>(event)

  if (!taskId) {
    throw createError({
      statusCode: 400,
      message: 'Task ID is required',
    })
  }

  const updateData: any = {}

  if (body.title !== undefined) updateData.title = body.title
  if (body.description !== undefined) updateData.description = body.description
  if (body.category !== undefined) updateData.category = body.category
  if (body.priority !== undefined) updateData.priority = body.priority
  if (body.due_date !== undefined) updateData.due_date = body.due_date
  if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to
  if (body.assigned_role !== undefined) updateData.assigned_role = body.assigned_role
  if (body.notes !== undefined) updateData.notes = body.notes
  if (body.sort_order !== undefined) updateData.sort_order = body.sort_order

  if (body.status !== undefined) {
    updateData.status = body.status
    // If marking as completed, set completion info
    if (body.status === 'completed' && !body.completed_at) {
      updateData.completed_at = new Date().toISOString()
      updateData.completed_by = user.id
    }
  }

  if (body.completed_at !== undefined) updateData.completed_at = body.completed_at
  if (body.completed_by !== undefined) updateData.completed_by = body.completed_by

  const { data: task, error } = await client
    .from('recital_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single()

  if (error) {
    console.error('Error updating recital task:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update recital task',
    })
  }

  return task
})
