// server/api/students/index.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const query = getQuery(event)
    
    // Parse query parameters
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const search = query.search as string || ''
    const status = query.status as string || 'active'
    
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    // Build query
    let dbQuery = client
      .from('students')
      .select('*', { count: 'exact' })
    
    // Apply filters
    if (status !== 'all') {
      dbQuery = dbQuery.eq('status', status)
    }
    
    if (search) {
      dbQuery = dbQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }
    
    // Execute query with pagination
    const { data, count, error } = await dbQuery
      .range(from, to)
      .order('last_name')
    
    if (error) throw error
    
    return {
      students: data,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit)
      }
    }
  } catch (error) {
    console.error('Students API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch students'
    })
  }
})