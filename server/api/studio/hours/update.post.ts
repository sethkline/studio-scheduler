// server/api/studio/hours/update.post.ts
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)
    
    // Validate the request
    if (!body.locationId || !Array.isArray(body.hours)) {
      return createError({
        statusCode: 400,
        statusMessage: 'Invalid request format'
      })
    }
    
    const { locationId, hours } = body
    
    // First, delete existing hours for this location to avoid duplicates
    const { error: deleteError } = await client
      .from('operating_hours')
      .delete()
      .eq('location_id', locationId)
    
    if (deleteError) throw deleteError
    
    // Then, insert the new hours
    const hoursToInsert = hours.map(hour => ({
      location_id: locationId,
      day_of_week: hour.dayOfWeek,
      open_time: hour.openTime || '09:00:00',
      close_time: hour.closeTime || '17:00:00',
      is_closed: hour.isClosed || false
    }))
    
    const { error: insertError } = await client
      .from('operating_hours')
      .insert(hoursToInsert)
    
    if (insertError) throw insertError
    
    // Get updated hours
    const { data: updatedHours, error: getError } = await client
      .from('operating_hours')
      .select('*')
      .eq('location_id', locationId)
      .order('day_of_week')
    
    if (getError) throw getError
    
    return {
      message: 'Operating hours updated successfully',
      hours: updatedHours
    }
  } catch (error) {
    console.error('Update operating hours API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update operating hours'
    })
  }
})