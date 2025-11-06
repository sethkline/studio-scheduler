// server/api/email/templates/index.get.ts
import { getSupabaseClient } from '../../../utils/supabase'

/**
 * GET /api/email/templates
 * List all email templates (with optional filtering)
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)

    const {
      category,
      is_active,
      is_default,
      limit = 50,
      offset = 0,
    } = query

    let queryBuilder = client
      .from('email_templates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (category) {
      queryBuilder = queryBuilder.eq('category', category)
    }
    if (is_active !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', is_active === 'true')
    }
    if (is_default !== undefined) {
      queryBuilder = queryBuilder.eq('is_default', is_default === 'true')
    }

    // Apply pagination
    queryBuilder = queryBuilder.range(
      Number(offset),
      Number(offset) + Number(limit) - 1
    )

    const { data, error, count } = await queryBuilder

    if (error) {
      console.error('Error fetching email templates:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch email templates',
      })
    }

    return {
      templates: data,
      total: count,
      limit: Number(limit),
      offset: Number(offset),
    }
  } catch (error: any) {
    console.error('Email templates fetch error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error',
    })
  }
})
