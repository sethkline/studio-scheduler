import { requireAuth, requireAdmin } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

/**
 * Get Staff Users
 *
 * GET /api/users/staff
 *
 * Returns all users with staff, admin, or teacher roles for task assignment.
 */
export default defineEventHandler(async (event) => {  await requireAdmin(event)

  const client = await getUserSupabaseClient(event)

  try {
    const { data: users, error } = await client
      .from('profiles')
      .select('id, first_name, last_name, email, user_role')
      .in('user_role', ['admin', 'staff', 'teacher'])
      .order('first_name', { ascending: true })

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch staff users'
      })
    }

    return users || []
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch staff users'
    })
  }
})
