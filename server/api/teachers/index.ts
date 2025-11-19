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
    
    let teachersQuery = client
      .from('teachers')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('last_name')
    
    // Apply filters if provided
    if (query.status) {
      teachersQuery = teachersQuery.eq('status', query.status)
    }
    
    const { data, count, error } = await teachersQuery
    
    if (error) throw error
    
    return {
      teachers: data,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit)
      }
    }
  } catch (error) {
    console.error('Teachers API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch teachers'
    })
  }
})