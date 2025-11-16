/**
 * Newsletter Subscribers List API Endpoint
 *
 * Admin-only endpoint to get list of all newsletter subscribers.
 * Requires authentication and admin/staff role.
 */

import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const query = getQuery(event)

  // TODO: Add auth check for admin/staff role
  // const user = await requireAuth(event)
  // await requireRole(user, ['admin', 'staff'])

  // Get subscribers using database function
  const { data: subscribers, error } = await client
    .rpc('get_blog_newsletter_subscribers')

  if (error) {
    console.error('Newsletter subscribers error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch newsletter subscribers'
    })
  }

  // Optional: Add pagination if needed
  const limit = query.limit ? parseInt(query.limit as string) : 100
  const offset = query.offset ? parseInt(query.offset as string) : 0

  return {
    subscribers: subscribers.slice(offset, offset + limit),
    total: subscribers.length,
    limit,
    offset
  }
})
