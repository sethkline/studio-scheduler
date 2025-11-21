/**
 * GET /api/inbox/messages
 *
 * Fetch messages with filters, search, and pagination.
 * Supports filtering by type, status, assignment, read status, and more.
 *
 * Query Parameters:
 * - message_type: Filter by message type (email, internal, etc.)
 * - status: Filter by status (new, read, in_progress, etc.)
 * - assigned_to: Filter by assigned user (UUID or 'me' or 'unassigned')
 * - is_read: Filter by read status (boolean)
 * - is_starred: Filter by starred status (boolean)
 * - requires_action: Filter by action required (boolean)
 * - priority: Filter by priority (low, normal, high, urgent)
 * - tags: Filter by tags (array)
 * - search: Full-text search in subject and body
 * - date_from: Filter messages after this date
 * - date_to: Filter messages before this date
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 * - sort_by: Sort field (created_at, updated_at, priority)
 * - sort_order: Sort order (asc, desc)
 *
 * REQUIRES: Authenticated user
 */

import { getSupabaseClient } from '../../utils/supabase'
import type { InboxQueryParams, PaginatedMessagesResponse } from '~/types/inbox'

export default defineEventHandler(async (event): Promise<PaginatedMessagesResponse> => {
  try {
    const client = getSupabaseClient()

    // Get authenticated user
    const authHeader = event.headers.get('authorization')
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required',
      })
    }

    const { data: { user }, error: authError } = await client.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid authentication',
      })
    }

    // Get user's studio context
    const { data: profile } = await client
      .from('profiles')
      .select('studio_id, user_role')
      .eq('id', user.id)
      .single()

    if (!profile?.studio_id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'No studio context found',
      })
    }

    // Parse query parameters
    const query = getQuery(event) as Partial<InboxQueryParams>

    // Build base query with studio isolation
    let queryBuilder = client
      .from('messages')
      .select(`
        *,
        thread:message_threads(*)
      `, { count: 'exact' })
      .eq('studio_id', profile.studio_id)
      .is('deleted_at', null)

    // Apply filters
    if (query.message_type && query.message_type !== 'all') {
      queryBuilder = queryBuilder.eq('message_type', query.message_type)
    }

    if (query.status && query.status !== 'all') {
      queryBuilder = queryBuilder.eq('status', query.status)
    }

    if (query.assigned_to) {
      if (query.assigned_to === 'me') {
        queryBuilder = queryBuilder.eq('assigned_to', user.id)
      } else if (query.assigned_to === 'unassigned') {
        queryBuilder = queryBuilder.is('assigned_to', null)
      } else {
        queryBuilder = queryBuilder.eq('assigned_to', query.assigned_to)
      }
    }

    if (query.is_read !== undefined) {
      queryBuilder = queryBuilder.eq('is_read', query.is_read)
    }

    if (query.is_starred !== undefined) {
      queryBuilder = queryBuilder.eq('is_starred', query.is_starred)
    }

    if (query.requires_action !== undefined) {
      queryBuilder = queryBuilder.eq('requires_action', query.requires_action)
    }

    if (query.priority) {
      queryBuilder = queryBuilder.eq('priority', query.priority)
    }

    if (query.tags && query.tags.length > 0) {
      queryBuilder = queryBuilder.contains('tags', query.tags)
    }

    if (query.date_from) {
      queryBuilder = queryBuilder.gte('created_at', query.date_from)
    }

    if (query.date_to) {
      queryBuilder = queryBuilder.lte('created_at', query.date_to)
    }

    // Apply search if provided
    if (query.search && query.search.trim()) {
      queryBuilder = queryBuilder.textSearch(
        'fts',
        query.search.trim(),
        { type: 'websearch', config: 'english' }
      )
    }

    // Apply sorting
    const sortBy = query.sort_by || 'created_at'
    const sortOrder = query.sort_order || 'desc'
    queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const page = Math.max(1, parseInt(String(query.page || 1)))
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || 50))))
    const from = (page - 1) * limit
    const to = from + limit - 1

    queryBuilder = queryBuilder.range(from, to)

    // Execute query
    const { data: messages, error, count } = await queryBuilder

    if (error) {
      console.error('Error fetching messages:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch messages',
      })
    }

    // Get attachment counts for each message
    const messageIds = messages?.map(m => m.id) || []
    let attachmentCounts: Record<string, number> = {}

    if (messageIds.length > 0) {
      const { data: attachments } = await client
        .from('message_attachments')
        .select('message_id')
        .in('message_id', messageIds)

      if (attachments) {
        attachmentCounts = attachments.reduce((acc, att) => {
          acc[att.message_id] = (acc[att.message_id] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    }

    // Add attachment counts to messages
    const messagesWithCounts = messages?.map(msg => ({
      ...msg,
      attachment_count: attachmentCounts[msg.id] || 0,
    })) || []

    return {
      messages: messagesWithCounts,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
      filters: query as InboxQueryParams,
    }
  } catch (error: any) {
    console.error('Error in messages.get:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error',
    })
  }
})
