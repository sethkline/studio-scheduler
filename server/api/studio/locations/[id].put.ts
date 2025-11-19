import { requireAuth, requireAdmin } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdmin(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.name || !body.address || !body.city || !body.state || !body.postal_code) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    // Update the location
    const { data, error } = await client
      .from('studio_locations')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    return {
      message: 'Location updated successfully',
      location: data[0]
    }
  } catch (error) {
    console.error('Update location API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update location'
    })
  }
})