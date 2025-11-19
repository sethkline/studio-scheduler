// server/api/email/queue.get.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

/**
 * GET /api/email/queue
 * Get queued emails with filtering and pagination
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const query = getQuery(event)

    const {
      status,
      batch_id,
      scheduled_before,
      scheduled_after,
      limit = 50,
      offset = 0,
    } = query

    let queryBuilder = client
      .from('email_queue')
      .select('*', { count: 'exact' })
      .order('scheduled_for', { ascending: true })

    // Apply filters
    if (status) {
      queryBuilder = queryBuilder.eq('status', status)
    }
    if (batch_id) {
      queryBuilder = queryBuilder.eq('batch_id', batch_id)
    }
    if (scheduled_before) {
      queryBuilder = queryBuilder.lte('scheduled_for', scheduled_before)
    }
    if (scheduled_after) {
      queryBuilder = queryBuilder.gte('scheduled_for', scheduled_after)
    }

    // Apply pagination
    queryBuilder = queryBuilder.range(
      Number(offset),
      Number(offset) + Number(limit) - 1
    )

    const { data, error, count } = await queryBuilder

    if (error) {
      console.error('Error fetching email queue:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch email queue',
      })
    }

    return {
      queue: data,
      total: count,
      limit: Number(limit),
      offset: Number(offset),
    }
  } catch (error: any) {
    console.error('Email queue fetch error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error',
    })
  }
})
