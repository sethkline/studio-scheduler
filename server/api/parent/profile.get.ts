import { requireAuth, requireRole } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireRole(event, ['parent', 'admin', 'staff'])

  const client = await getUserSupabaseClient(event)
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Get guardian record for this user
  const { data: guardian, error: guardianError } = await client
    .from('guardians')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (guardianError || !guardian) {
    throw createError({
      statusCode: 404,
      message: 'Guardian profile not found',
    })
  }

  // Get user profile
  const { data: profile } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    guardian,
    profile,
  }
})
