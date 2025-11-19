import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const query = getQuery(event)
    const scheduleId = query.scheduleId as string
    
    if (!scheduleId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required parameter: scheduleId'
      })
    }
    
    // Fetch the publication history
    const { data, error } = await client
      .from('schedule_publish_history')
      .select(`
        id,
        schedule_id,
        version,
        published_at,
        published_by,
        notes,
        profiles:published_by (first_name, last_name)
      `)
      .eq('schedule_id', scheduleId)
      .order('version', { ascending: false })
    
    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Get publication history API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch publication history'
    })
  }
})