import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'
import type { Costume } from '~/types/costumes'

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

  // Fetch all costumes
  const { data: costumes, error } = await client
    .from('costumes')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching costumes:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch costumes',
    })
  }

  return costumes as Costume[]
})
