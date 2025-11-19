// server/api/email/preferences.put.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

/**
 * PUT /api/email/preferences
 * Update email preferences
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const body = await readBody(event)
    const query = getQuery(event)
    const token = query.token as string | undefined

    const updateData: any = {}

    // Build update object with allowed fields
    if (body.email_enabled !== undefined) updateData.email_enabled = body.email_enabled
    if (body.enrollment_emails !== undefined) updateData.enrollment_emails = body.enrollment_emails
    if (body.payment_emails !== undefined) updateData.payment_emails = body.payment_emails
    if (body.recital_emails !== undefined) updateData.recital_emails = body.recital_emails
    if (body.announcement_emails !== undefined) updateData.announcement_emails = body.announcement_emails
    if (body.reminder_emails !== undefined) updateData.reminder_emails = body.reminder_emails
    if (body.marketing_emails !== undefined) updateData.marketing_emails = body.marketing_emails

    // Track unsubscribe timestamp
    if (body.email_enabled === false && !body.unsubscribed_at) {
      updateData.unsubscribed_at = new Date().toISOString()
    }

    if (Object.keys(updateData).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No valid fields to update',
      })
    }

    let result

    if (token) {
      // Update by unsubscribe token (for unauthenticated access)
      const { data, error } = await client
        .from('email_preferences')
        .update(updateData)
        .eq('unsubscribe_token', token)
        .select()
        .single()

      if (error) {
        console.error('Error updating email preferences:', error)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to update email preferences',
        })
      }

      result = data
    } else {
      // Update for current user
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
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating email preferences:', error)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to update email preferences',
        })
      }

      result = data
    }

    return {
      success: true,
      preferences: result,
    }
  } catch (error: any) {
    console.error('Email preferences update error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error',
    })
  }
})
