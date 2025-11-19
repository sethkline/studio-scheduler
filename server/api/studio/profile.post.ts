import { requireAuth, requireAdmin } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdmin(event)

  try {
    const client = await getUserSupabaseClient(event)
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.name) {
      return createError({
        statusCode: 400,
        statusMessage: 'Studio name is required'
      })
    }
    
    // Check if profile already exists
    const { data: existingProfile } = await client
      .from('studio_profile')
      .select('id')
      .maybeSingle()
    
    let result
    
    if (existingProfile) {
      // Update existing profile
      const { data, error } = await client
        .from('studio_profile')
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id)
        .select()
      
      if (error) throw error
      result = data[0]
    } else {
      // Create new profile
      const { data, error } = await client
        .from('studio_profile')
        .insert([body])
        .select()
      
      if (error) throw error
      result = data[0]
    }
    
    return {
      message: 'Studio profile updated successfully',
      profile: result
    }
  } catch (error) {
    console.error('Update studio profile API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update studio profile'
    })
  }
})