import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    
    const { data, error } = await client
      .from('class_definitions')
      .select('*')
      .order('name')
    
    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Class definitions API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch class definitions'
    })
  }
})