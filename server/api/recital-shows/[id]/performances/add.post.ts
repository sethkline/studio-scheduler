// server/api/recital-shows/[id]/performances/add.post.ts
import { getSupabaseClient } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const recitalId = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.class_instance_id) {
      return createError({
        statusCode: 400,
        statusMessage: 'Class instance is required'
      })
    }
    
    // Get highest performance order for this recital
    const { data: existingPerformances, error: orderError } = await client
      .from('recital_performances')
      .select('performance_order')
      .eq('recital_id', recitalId)
      .order('performance_order', { ascending: false })
      .limit(1)
    
    if (orderError) throw orderError
    
    // Calculate next performance order
    const nextOrder = existingPerformances && existingPerformances.length > 0 
      ? existingPerformances[0].performance_order + 1 
      : 0
    
    // Insert new performance
    const { data, error } = await client
      .from('recital_performances')
      .insert([{
        ...body,
        recital_id: recitalId,
        performance_order: nextOrder
      }])
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
      message: 'Performance added successfully',
      performance: data[0]
    }
  } catch (error) {
    console.error('Add performance API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to add performance'
    })
  }
})