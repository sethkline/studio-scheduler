// server/api/classes/index.ts
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
    
    // Fetch classes with related data
    const { data, count, error } = await client
      .from('class_definitions')
      .select(`
        id,
        name,
        min_age,
        max_age,
        description,
        duration,
        max_students,
        dance_style:dance_style_id (id, name, color),
        class_level:class_level_id (id, name)
      `, { count: 'exact' })
      .range(from, to)
      .order('name')
    
    if (error) throw error
    
    return {
      classes: data,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit)
      }
    }
  } catch (error) {
    console.error('Classes API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch classes'
    })
  }
})