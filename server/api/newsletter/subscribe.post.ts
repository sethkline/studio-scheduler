import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  // Public endpoint - querying public data only

  const client = getSupabaseClient()
  const body = await readBody(event)

  const { email, name } = body

  if (!email || !email.includes('@')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid email is required',
    })
  }

  // Check if already subscribed
  const { data: existing } = await client
    .from('newsletter_subscribers')
    .select('*')
    .eq('email', email)
    .single()

  if (existing) {
    // If unsubscribed, resubscribe
    if (existing.status === 'unsubscribed') {
      const { error } = await client
        .from('newsletter_subscribers')
        .update({
          status: 'active',
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
        })
        .eq('email', email)

      if (error) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to resubscribe',
        })
      }

      return { message: 'Resubscribed successfully' }
    }

    return { message: 'Already subscribed' }
  }

  // New subscription
  const { error } = await client
    .from('newsletter_subscribers')
    .insert({
      email,
      name,
      status: 'active',
    })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to subscribe',
      data: error,
    })
  }

  // TODO: Send welcome email via Mailgun

  return { message: 'Subscribed successfully' }
})
