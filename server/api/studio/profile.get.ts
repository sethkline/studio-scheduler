// server/api/studio/profile.get.ts
import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    
    // Fetch the studio profile (assuming there's only one)
    const { data, error } = await client
      .from('studio_profile')
      .select('*')
      .single()
    
    if (error) {
      // If no profile exists yet, return empty object instead of error
      if (error.code === 'PGRST116') {
        return {}
      }
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Get studio profile API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch studio profile'
    })
  }
})