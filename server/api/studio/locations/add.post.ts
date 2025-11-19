import { requireAuth, requireAdmin } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdmin(event)

  try {
    const client = await getUserSupabaseClient(event)
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.name || !body.address || !body.city || !body.state || !body.postal_code) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    // Insert the new location
    // Remove the 'id' field from the body because its auto-generated
    const { id, ...locationData } = body
    const { data, error } = await client
      .from('studio_locations')
      .insert([locationData])
      .select()
    
    if (error) throw error
    
    // Initialize operating hours for this location
    const defaultHours = Array.from({ length: 7 }, (_, i) => ({
      location_id: data[0].id,
      day_of_week: i,
      open_time: '09:00:00',
      close_time: '21:00:00',
      is_closed: i === 0 // Default closed on Sundays (day 0)
    }))
    
    await client
      .from('operating_hours')
      .insert(defaultHours)
    
    return {
      message: 'Location created successfully',
      location: data[0]
    }
  } catch (error) {
    console.error('Add location API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create studio location'
    })
  }
})