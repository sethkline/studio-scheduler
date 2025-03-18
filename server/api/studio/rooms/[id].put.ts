import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.name) {
      return createError({
        statusCode: 400,
        statusMessage: 'Room name is required'
      })
    }
    
    // Update the room
    const { data, error } = await client
      .from('studio_rooms')
      .update({
        name: body.name,
        description: body.description,
        capacity: body.capacity,
        area_sqft: body.areaSqft,
        features: body.features,
        is_active: body.isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    return {
      message: 'Room updated successfully',
      room: data[0]
    }
  } catch (error) {
    console.error('Update room API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update room'
    })
  }
})

