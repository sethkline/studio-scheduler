import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'
import type { CreateRecitalTaskForm } from '~/types/volunteers'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
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

  const body = await readBody<CreateRecitalTaskForm>(event)

  if (!body.recital_id || !body.title) {
    throw createError({
      statusCode: 400,
      message: 'Recital ID and title are required',
    })
  }

  const { data: task, error } = await client
    .from('recital_tasks')
    .insert({
      recital_id: body.recital_id,
      recital_show_id: body.recital_show_id,
      title: body.title,
      description: body.description,
      category: body.category,
      priority: body.priority || 'medium',
      due_date: body.due_date,
      assigned_to: body.assigned_to,
      assigned_role: body.assigned_role,
      notes: body.notes,
      sort_order: body.sort_order || 0,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating recital task:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create recital task',
    })
  }

  return task
})
