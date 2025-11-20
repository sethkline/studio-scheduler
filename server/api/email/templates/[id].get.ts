// server/api/email/templates/[id].get.ts
import { getSupabaseClient } from '../../../utils/supabase'

/**
 * GET /api/email/templates/[id]
 * Get a single email template by ID
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Template ID is required',
      })
    }

    const { data, error } = await client
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Email template not found',
      })
    }

    return {
      template: data,
    }
  } catch (error: any) {
    console.error('Email template fetch error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error',
    })
  }
})
