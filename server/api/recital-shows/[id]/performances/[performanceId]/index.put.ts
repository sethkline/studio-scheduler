// server/api/recital-shows/[id]/performances/[performanceId]/index.put.ts
import { getSupabaseClient } from '../../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const recitalId = getRouterParam(event, 'id')
    const performanceId = getRouterParam(event, 'performanceId')
    const body = await readBody(event)
    
    // Validate that the performance belongs to this recital
    const { data: performance, error: checkError } = await client
      .from('recital_performances')
      .select('id')
      .eq('id', performanceId)
      .eq('recital_id', recitalId)
      .single()
    
    if (checkError) {
      // If no performance found, return appropriate error
      if (checkError.code === 'PGRST116') {
        return createError({
          statusCode: 404,
          statusMessage: 'Performance not found for this recital'
        })
      }
      throw checkError
    }
    
    // Update the performance
    const { data, error } = await client
      .from('recital_performances')
      .update(body)
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
            dance_style:dance_style_id (
              id,
              name,
              color
            )
          )
        )
      `)
    
    if (error) throw error
    
    return {
      message: 'Performance updated successfully',
      performance: data[0]
    }
  } catch (error) {
    console.error('Update performance error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update performance'
    })
  }
})