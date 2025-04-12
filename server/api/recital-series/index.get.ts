// server/api/recital-series/index.ts
import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)
    
    // Parse query parameters
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    // Fetch recital series with count
    const { data, count, error } = await client
      .from('recital_series')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('year', { ascending: false })
      .order('name')
    
    if (error) throw error
    
    return {
      series: data,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit)
      }
    }
  } catch (error) {
    console.error('Recital Series API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch recital series'
    })
  }
})