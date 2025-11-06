/**
 * GET /api/billing/invoices
 * List invoices with optional filtering
 */

import type { Invoice } from '~/types/billing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const query = getQuery(event)

  // Build query
  let supabaseQuery = client
    .from('invoices')
    .select(`
      *,
      parent:profiles!invoices_parent_user_id_fkey(user_id, full_name, email),
      student:students(id, first_name, last_name)
    `)
    .order('issue_date', { ascending: false })

  // Filter by parent
  if (query.parent_user_id) {
    supabaseQuery = supabaseQuery.eq('parent_user_id', query.parent_user_id)
  }

  // Filter by student
  if (query.student_id) {
    supabaseQuery = supabaseQuery.eq('student_id', query.student_id)
  }

  // Filter by status
  if (query.status) {
    if (Array.isArray(query.status)) {
      supabaseQuery = supabaseQuery.in('status', query.status)
    } else {
      supabaseQuery = supabaseQuery.eq('status', query.status)
    }
  }

  // Filter by overdue
  if (query.overdue === 'true') {
    supabaseQuery = supabaseQuery
      .in('status', ['sent', 'viewed', 'partial_paid', 'overdue'])
      .lt('due_date', new Date().toISOString().split('T')[0])
  }

  // Filter by date range
  if (query.start_date) {
    supabaseQuery = supabaseQuery.gte('issue_date', query.start_date)
  }
  if (query.end_date) {
    supabaseQuery = supabaseQuery.lte('issue_date', query.end_date)
  }

  // Pagination
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 50
  const offset = (page - 1) * limit

  supabaseQuery = supabaseQuery.range(offset, offset + limit - 1)

  const { data, error, count } = await supabaseQuery

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch invoices: ${error.message}`,
    })
  }

  return {
    success: true,
    data: data as Invoice[],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  }
})
