// server/api/recital-series/[id]/index.get.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    
    const { data, error } = await client
      .from('recital_series')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    return {
      series: data
    }
  } catch (error) {
    console.error('Get recital series API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch recital series'
    })
  }
})