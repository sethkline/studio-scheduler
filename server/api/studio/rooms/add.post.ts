import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.locationId || !body.name) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    // Insert the new room
    const { data, error } = await client
      .from('studio_rooms')
      .insert([{
        location_id: body.locationId,
        name: body.name,
        description: body.description,
        capacity: body.capacity,
        area_sqft: body.areaSqft,
        features: body.features,
        is_active: body.isActive !== undefined ? body.isActive : true
      }])
      .select()
    
    if (error) throw error
    
    return {
      message: 'Room created successfully',
      room: data[0]
    }
  } catch (error) {
    console.error('Add room API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create room'
    })
  }
})

