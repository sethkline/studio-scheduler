// server/api/admin/audit-logs.get.ts

import { logError } from '~/server/utils/logger'

/**
 * GET /api/admin/audit-logs
 * Fetch audit logs for the admin dashboard
 * Requires: Admin role only
 *
 * Query parameters:
 * - user_id: Filter by user
 * - action: Filter by action type
 * - resource_type: Filter by resource type
 * - resource_id: Filter by specific resource
 * - from_date: Filter logs from this date (ISO string)
 * - to_date: Filter logs to this date (ISO string)
 * - limit: Number of logs to return (default: 100, max: 1000)
 * - offset: Pagination offset (default: 0)
 */
export default defineEventHandler(async (event) => {
  // Require admin role
  await requireAdmin(event)

  const client = getSupabaseClient()
  const query = getQuery(event)

  // Extract query parameters
  const userId = query.user_id as string | undefined
  const action = query.action as string | undefined
  const resourceType = query.resource_type as string | undefined
  const resourceId = query.resource_id as string | undefined
  const fromDate = query.from_date as string | undefined
  const toDate = query.to_date as string | undefined
  const limit = Math.min(parseInt(query.limit as string || '100'), 1000)
  const offset = parseInt(query.offset as string || '0')

  try {
    // Build query
    let queryBuilder = client
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (userId) {
      queryBuilder = queryBuilder.eq('user_id', userId)
    }

    if (action) {
      queryBuilder = queryBuilder.eq('action', action)
    }

    if (resourceType) {
      queryBuilder = queryBuilder.eq('resource_type', resourceType)
    }

    if (resourceId) {
      queryBuilder = queryBuilder.eq('resource_id', resourceId)
    }

    if (fromDate) {
      queryBuilder = queryBuilder.gte('created_at', fromDate)
    }

    if (toDate) {
      queryBuilder = queryBuilder.lte('created_at', toDate)
    }

    // Apply pagination
    queryBuilder = queryBuilder.range(offset, offset + limit - 1)

    const { data: logs, error, count } = await queryBuilder

    if (error) {
      logError(new Error('Failed to fetch audit logs'), {
        context: 'audit_logs_fetch',
        error,
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch audit logs'
      })
    }

    return {
      success: true,
      data: logs || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    }
  } catch (error: any) {
    logError(error, {
      context: 'audit_logs_api',
    })

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch audit logs'
    })
  }
})
