import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)

    // Parse query parameters for pagination
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 50
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Filter parameters
    const category = query.category as string
    const is_active = query.is_active as string
    const search = query.search as string
    const sort_by = (query.sort_by as string) || 'sort_order'
    const sort_direction = (query.sort_direction as string) || 'asc'

    // Build the query
    let productsQuery = client
      .from('merchandise_products')
      .select('*, variants:merchandise_variants(*, inventory:merchandise_inventory(*))', { count: 'exact' })

    // Apply filters
    if (category) {
      productsQuery = productsQuery.eq('category', category)
    }

    if (is_active !== undefined) {
      productsQuery = productsQuery.eq('is_active', is_active === 'true')
    }

    if (search) {
      productsQuery = productsQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply sorting
    const ascending = sort_direction === 'asc'
    productsQuery = productsQuery.order(sort_by, { ascending })

    // Apply pagination
    const { data, count, error } = await productsQuery
      .range(from, to)

    if (error) throw error

    return {
      products: data,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  } catch (error) {
    console.error('Get products API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch products'
    })
  }
})
