/**
 * Newsletter Unsubscribe API Endpoint
 *
 * Public endpoint that allows anyone to unsubscribe from the blog newsletter
 * or all studio emails. Uses the unified email campaign system.
 */

import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  // Public endpoint - querying public data only

  const client = getSupabaseClient()

  // Validate email
  if (!body.email) {
    throw createError({
      statusCode: 400,
      message: 'Email address is required'
    })
  }

  // Unsubscribe using database function
  const { data, error } = await client
    .rpc('unsubscribe_from_blog_newsletter', {
      p_email: body.email.toLowerCase().trim(),
      p_unsubscribe_all: body.unsubscribeAll || false
    })

  if (error) {
    console.error('Newsletter unsubscribe error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to unsubscribe from newsletter'
    })
  }

  return data
})
