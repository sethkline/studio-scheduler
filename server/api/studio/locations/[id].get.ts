import { requireAuth, requireAdmin } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdmin(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    
    // Get the location details
    const { data: location, error: locationError } = await client
      .from('studio_locations')
      .select('*')
      .eq('id', id)
      .single()
    
    if (locationError) throw locationError
    
    // Get rooms for this location
    const { data: rooms, error: roomsError } = await client
      .from('studio_rooms')
      .select('*')
      .eq('location_id', id)
      .order('name')
    
    if (roomsError) throw roomsError
    
    // Get operating hours for this location
    const { data: operatingHours, error: hoursError } = await client
      .from('operating_hours')
      .select('*')
      .eq('location_id', id)
      .order('day_of_week')
    
    if (hoursError) throw hoursError
    
    // Get special operating hours for this location
    const { data: specialHours, error: specialHoursError } = await client
      .from('special_operating_hours')
      .select('*')
      .eq('location_id', id)
      .gte('date', new Date().toISOString().split('T')[0]) // Only future special hours
      .order('date')
    
    if (specialHoursError) throw specialHoursError
    
    return {
      ...location,
      rooms,
      operatingHours,
      specialHours
    }
  } catch (error) {
    console.error('Get location details API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch location details'
    })
  }
})