import { getSupabaseClient } from '../../../utils/supabase'

/**
 * Get all resources for a rehearsal
 * GET /api/rehearsals/[id]/resources
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const rehearsalId = getRouterParam(event, 'id')

    // Get resources
    const { data: resources, error } = await client
      .from('rehearsal_resources')
      .select('*')
      .eq('rehearsal_id', rehearsalId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      resources: resources || []
    }
  } catch (error: any) {
    console.error('Get resources API error:', error)

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch resources'
    })
  }
})
