/**
 * Newsletter Stats API Endpoint
 *
 * Admin-only endpoint to get newsletter subscriber statistics.
 * Requires authentication and admin/staff role.
 */

import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()

  // TODO: Add auth check for admin/staff role
  // const user = await requireAuth(event)
  // await requireRole(user, ['admin', 'staff'])

  // Get stats from view
  const { data: stats, error } = await client
    .from('newsletter_subscriber_stats')
    .select('*')
    .single()

  if (error) {
    console.error('Newsletter stats error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch newsletter statistics'
    })
  }

  return { stats }
})
