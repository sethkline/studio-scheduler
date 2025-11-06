import { getSupabaseClient } from '~/server/utils/supabase'
import type { RecitalTaskWithDetails } from '~/types/volunteers'

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

  const query = getQuery(event)
  const recitalId = query.recital_id as string | undefined
  const showId = query.recital_show_id as string | undefined
  const status = query.status as string | undefined

  let tasksQuery = client
    .from('recital_tasks')
    .select(`
      *,
      recital:recitals (
        id,
        name
      ),
      recital_show:recital_shows (
        id,
        title
      ),
      assigned_user:profiles!recital_tasks_assigned_to_fkey (
        id,
        first_name,
        last_name
      ),
      completed_by_user:profiles!recital_tasks_completed_by_fkey (
        id,
        first_name,
        last_name
      )
    `)
    .order('sort_order', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })

  if (recitalId) {
    tasksQuery = tasksQuery.eq('recital_id', recitalId)
  }

  if (showId) {
    tasksQuery = tasksQuery.eq('recital_show_id', showId)
  }

  if (status) {
    tasksQuery = tasksQuery.eq('status', status)
  }

  const { data: tasks, error } = await tasksQuery

  if (error) {
    console.error('Error fetching recital tasks:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch recital tasks',
    })
  }

  return tasks as RecitalTaskWithDetails[]
})
