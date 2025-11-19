// server/api/email/unsubscribe.post.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

/**
 * POST /api/email/unsubscribe
 * Unsubscribe from all emails using token
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const body = await readBody<{ token: string }>(event)

    if (!body.token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Unsubscribe token is required',
      })
    }

    const { data, error } = await client
      .from('email_preferences')
      .update({
        email_enabled: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('unsubscribe_token', body.token)
      .select()
      .single()

    if (error) {
      console.error('Error unsubscribing:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to unsubscribe',
      })
    }

    if (!data) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Invalid unsubscribe token',
      })
    }

    return {
      success: true,
      message: 'Successfully unsubscribed from all emails',
      email: data.email,
    }
  } catch (error: any) {
    console.error('Unsubscribe error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error',
    })
  }
})
