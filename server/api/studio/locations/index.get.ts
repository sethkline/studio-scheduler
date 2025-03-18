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
    
    // Include only active locations if specified
    const activeOnly = query.activeOnly === 'true'
    
    let locationQuery = client
      .from('studio_locations')
      .select('*', { count: 'exact' })
    
    if (activeOnly) {
      locationQuery = locationQuery.eq('is_active', true)
    }
    
    const { data, count, error } = await locationQuery
      .range(from, to)
      .order('name')
    
    if (error) throw error
    
    return {
      locations: data,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit)
      }
    }
  } catch (error) {
    console.error('Get locations API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch studio locations'
    })
  }
})

