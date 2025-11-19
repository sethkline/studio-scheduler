/**
 * Newsletter Stats API Endpoint
 *
 * Admin-only endpoint to get newsletter subscriber statistics.
 * Requires authentication and admin/staff role.
 */

import { requireAdmin } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const client = await getUserSupabaseClient(event)

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
