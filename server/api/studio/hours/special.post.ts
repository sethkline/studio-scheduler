import { requireAuth, requireAdmin } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdmin(event)

  try {
    const client = await getUserSupabaseClient(event)
    const body = await readBody(event)
    
    // Validate the request
    if (!body.locationId || !body.date) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    const { locationId, date, isClosed, openTime, closeTime, description } = body
    
    // Validate time format if not closed
    if (!isClosed && (!openTime || !closeTime)) {
      return createError({
        statusCode: 400,
        statusMessage: 'Open and close times are required when not closed'
      })
    }
    
    // Check if an entry already exists for this date
    const { data: existing } = await client
      .from('special_operating_hours')
      .select('id')
      .eq('location_id', locationId)
      .eq('date', date)
      .maybeSingle()
    
    let result
    
    if (existing) {
      // Update existing record
      const { data, error } = await client
        .from('special_operating_hours')
        .update({
          open_time: openTime,
          close_time: closeTime,
          is_closed: isClosed,
          description,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
      
      if (error) throw error
      result = data[0]
    } else {
      // Create new record
      const { data, error } = await client
        .from('special_operating_hours')
        .insert([{
          location_id: locationId,
          date,
          open_time: openTime,
          close_time: closeTime,
          is_closed: isClosed,
          description
        }])
        .select()
      
      if (error) throw error
      result = data[0]
    }
    
    return {
      message: 'Special hours updated successfully',
      specialHours: result
    }
  } catch (error) {
    console.error('Update special hours API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update special hours'
    })
  }
})