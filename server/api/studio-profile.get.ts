// Alias endpoint for /api/studio/profile
import { getSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()

    const { data: profile, error } = await client
      .from('studio_profile')
      .select('*')
      .single()

    if (error) {
      // If no profile exists yet, return null instead of error
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return profile
  } catch (error) {
    console.error('Studio profile API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch studio profile'
    })
  }
})
