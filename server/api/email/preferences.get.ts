// server/api/email/preferences.get.ts
import { getSupabaseClient } from '../../utils/supabase'

/**
 * GET /api/email/preferences
 * Get email preferences for the current user or by token
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)
    const token = query.token as string | undefined

    let preferences

    if (token) {
      // Get by unsubscribe token (for unauthenticated access)
      const { data, error } = await client
        .from('email_preferences')
        .select('*')
        .eq('unsubscribe_token', token)
        .single()

      if (error || !data) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Email preferences not found',
        })
      }

      preferences = data
    } else {
      // Get for current user
      const authHeader = event.headers.get('authorization')
      if (!authHeader) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Authentication required',
        })
      }

      const { data: { user } } = await client.auth.getUser(authHeader.replace('Bearer ', ''))
      if (!user) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Invalid authentication',
        })
      }

      const { data, error } = await client
        .from('email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        // Create default preferences if they don't exist
        const { data: profile } = await client
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .single()

        if (!profile?.email) {
          throw createError({
            statusCode: 404,
            statusMessage: 'User email not found',
          })
        }

        const { data: newPrefs, error: createError } = await client
          .from('email_preferences')
          .insert({
            user_id: user.id,
            email: profile.email,
          })
          .select()
          .single()

        if (createError) {
          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to create email preferences',
          })
        }

        preferences = newPrefs
      } else {
        preferences = data
      }
    }

    return {
      preferences,
    }
  } catch (error: any) {
    console.error('Email preferences fetch error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error',
    })
  }
})
