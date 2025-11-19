// server/api/recital-shows/[id]/performances/reorder.put.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    // Validate request
    if (!body.performanceOrder || !Array.isArray(body.performanceOrder)) {
      return createError({
        statusCode: 400,
        statusMessage: 'Performance order array is required'
      })
    }
    
    // Get current performances to validate IDs and for response data
    const { data: existingPerformances, error: fetchError } = await client
      .from('recital_performances')
      .select('id')
      .eq('recital_id', id)
    
    if (fetchError) throw fetchError
    
    // Validate that the provided IDs match existing performances
    const existingIds = new Set(existingPerformances.map(p => p.id))
    const requestedIds = new Set(body.performanceOrder)
    
    if (existingIds.size !== requestedIds.size || 
        !Array.from(existingIds).every(id => requestedIds.has(id))) {
      return createError({
        statusCode: 400,
        statusMessage: 'Performance IDs do not match existing performances'
      })
    }
    
    // Update each performance with new order
    const updates = body.performanceOrder.map((performanceId, index) => ({
      id: performanceId,
      performance_order: index
    }))
    
    // Update performances one by one or use a transaction if available
    for (const update of updates) {
      const { error } = await client
        .from('recital_performances')
        .update({ performance_order: update.performance_order })
        .eq('id', update.id)
      
      if (error) throw error
    }
    
    // Fetch the updated performances for response
    const { data: updatedPerformances, error: getError } = await client
      .from('recital_performances')
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
      .eq('recital_id', id)
      .order('performance_order')
    
    if (getError) throw getError
    
    return {
      message: 'Performance order updated successfully',
      performances: updatedPerformances
    }
  } catch (error) {
    console.error('Update performance order error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update performance order'
    })
  }
})