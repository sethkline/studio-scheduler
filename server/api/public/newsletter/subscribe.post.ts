/**
 * Newsletter Subscribe API Endpoint
 *
 * Public endpoint that allows anyone to subscribe to the blog newsletter.
 * Uses the unified email campaign system (email_campaign_unsubscribes table).
 */

import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = getSupabaseClient()

  // Validate email
  if (!body.email || !isValidEmail(body.email)) {
    throw createError({
      statusCode: 400,
      message: 'Valid email address is required'
    })
  }

  // Subscribe using database function
  const { data, error } = await client
    .rpc('subscribe_to_blog_newsletter', {
      p_email: body.email.toLowerCase().trim(),
      p_name: body.name || null,
      p_source: body.source || 'website_form'
    })

  if (error) {
    console.error('Newsletter subscription error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to subscribe to newsletter'
    })
  }

  // TODO: Send confirmation email via Mailgun
  // if (data.success) {
  //   await sendNewsletterWelcomeEmail(body.email, body.name)
  // }

  return data
})

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
