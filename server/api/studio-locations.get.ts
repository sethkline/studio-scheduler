// Alias endpoint for /api/studio/locations
import { getSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()

    const { data: locations, error } = await client
      .from('studio_locations')
      .select('*')
      .order('name')

    if (error) throw error

    return locations || []
  } catch (error) {
    console.error('Studio locations API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch studio locations'
    })
  }
})
