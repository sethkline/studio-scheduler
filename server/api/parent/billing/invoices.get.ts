/**
 * GET /api/parent/billing/invoices
 * Get invoices for the authenticated parent
 */

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const query = getQuery(event)

  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  try {
    // Build query
    let supabaseQuery = client
      .from('invoices')
      .select(`
        *,
        student:students(id, first_name, last_name)
      `)
      .eq('parent_user_id', user.id)
      .order('issue_date', { ascending: false })

    // Filter by status
    if (query.status) {
      if (Array.isArray(query.status)) {
        supabaseQuery = supabaseQuery.in('status', query.status)
      } else {
        supabaseQuery = supabaseQuery.eq('status', query.status)
      }
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
    const limit = parseInt(query.limit as string) || 20
    const offset = (page - 1) * limit

    supabaseQuery = supabaseQuery.range(offset, offset + limit - 1)

    const { data, error, count } = await supabaseQuery

    if (error) {
      throw new Error(`Failed to fetch invoices: ${error.message}`)
    }

    return {
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch invoices: ${error.message}`,
    })
  }
})
