import { getSupabaseClient } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const recitalId = getRouterParam(event, 'id')
    const performanceId = getRouterParam(event, 'performanceId')
    const body = await readBody(event)
    
    if (!recitalId || !performanceId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Recital ID and Performance ID are required'
      })
    }
    
    // Verify the performance exists and belongs to the specified recital
    const { data: performance, error: perfError } = await client
      .from('recital_performances')
      .select('id')
      .eq('id', performanceId)
      .eq('recital_id', recitalId)
      .single()
    
    if (perfError) {
      console.error('Error fetching performance:', perfError)
      return createError({
        statusCode: 404,
        statusMessage: 'Performance not found for this recital'
      })
    }
    
    // Prepare the update data, only including fields that are provided
    const updateData = {}
    
    if (body.song_title !== undefined) updateData.song_title = body.song_title
    if (body.song_artist !== undefined) updateData.song_artist = body.song_artist
    if (body.choreographer !== undefined) updateData.choreographer = body.choreographer
    if (body.duration !== undefined) updateData.duration = body.duration
    if (body.notes !== undefined) updateData.notes = body.notes
    
    // Only proceed with update if there are changes
    if (Object.keys(updateData).length === 0) {
      return {
        message: 'No changes to update',
        performance
      }
    }
    
    // Update the performance
    const { data: updatedPerformance, error: updateError } = await client
      .from('recital_performances')
      .update(updateData)
      .eq('id', performanceId)
      .select(`
        id, 
        performance_order,
        song_title,
        song_artist,
        duration,
        notes,
        choreographer,
        class_instance:class_instance_id (
          id,
          name,
          class_definition:class_definition_id (
            id,
            name,
            dance_style:dance_style_id (id, name, color)
          )
        )
      `)
      .single()
    
    if (updateError) throw updateError
    
    return {
      message: 'Performance updated successfully',
      performance: updatedPerformance
    }
  } catch (error) {
    console.error('Update performance API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update performance'
    })
  }
})