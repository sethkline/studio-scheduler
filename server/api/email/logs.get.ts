// server/api/email/logs.get.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

/**
 * GET /api/email/logs
 * Get email logs with filtering and pagination
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const query = getQuery(event)

    const {
      status,
      recipient_email,
      recipient_type,
      template_id,
      start_date,
      end_date,
      limit = 50,
      offset = 0,
    } = query

    let queryBuilder = client
      .from('email_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      queryBuilder = queryBuilder.eq('status', status)
    }
    if (recipient_email) {
      queryBuilder = queryBuilder.eq('recipient_email', recipient_email)
    }
    if (recipient_type) {
      queryBuilder = queryBuilder.eq('recipient_type', recipient_type)
    }
    if (template_id) {
      queryBuilder = queryBuilder.eq('template_id', template_id)
    }
    if (start_date) {
      queryBuilder = queryBuilder.gte('created_at', start_date)
    }
    if (end_date) {
      queryBuilder = queryBuilder.lte('created_at', end_date)
    }

    // Apply pagination
    queryBuilder = queryBuilder.range(
      Number(offset),
      Number(offset) + Number(limit) - 1
    )

    const { data, error, count } = await queryBuilder

    if (error) {
      console.error('Error fetching email logs:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch email logs',
      })
    }

    return {
      logs: data,
      total: count,
      limit: Number(limit),
      offset: Number(offset),
    }
  } catch (error: any) {
    console.error('Email logs fetch error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error',
    })
  }
})
