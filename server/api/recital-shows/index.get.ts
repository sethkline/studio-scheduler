// server/api/recital-shows/index.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const query = getQuery(event)
    
    // Parse query parameters
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const from = (page - 1) * limit
    const to = from + limit - 1
    const seriesId = query.seriesId as string
    
    // Build query
    let showsQuery = client
      .from('recital_shows')
      .select(`
        id,
        name,
        description,
        date,
        start_time,
        end_time,
        location,
        status,
        series:series_id (id, name, theme, year),
        program:recital_programs(id)
      `, { count: 'exact' })
    
    // Add filter for series if provided
    if (seriesId) {
      showsQuery = showsQuery.eq('series_id', seriesId)
    }
    
    // Apply pagination and order
    const { data, count, error } = await showsQuery
      .range(from, to)
      .order('date', { ascending: false })
      .order('start_time')
    
    if (error) throw error
    
    return {
      shows: data,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit)
      }
    }
  } catch (error) {
    console.error('Recital Shows API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch recital shows'
    })
  }
})