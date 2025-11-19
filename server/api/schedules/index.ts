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
    
    // Support filtering by active status
    const isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : null
    
    // Build the query
    let scheduleQuery = client
      .from('schedules')
      .select('*', { count: 'exact' })
    
    // Apply filters
    if (isActive !== null) {
      scheduleQuery = scheduleQuery.eq('is_active', isActive)
    }
    
    // Apply pagination and ordering
    const { data, count, error } = await scheduleQuery
      .range(from, to)
      .order('start_date', { ascending: false })
    
    if (error) throw error
    
    return {
      schedules: data,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit)
      }
    }
  } catch (error) {
    console.error('Schedules API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch schedules'
    })
  }
})