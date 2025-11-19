import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const recitalId = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    if (!recitalId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Recital ID is required'
      })
    }
    
    if (!body.performanceOrder || !Array.isArray(body.performanceOrder)) {
      return createError({
        statusCode: 400,
        statusMessage: 'Performance order array is required'
      })
    }
    
    // Verify the recital exists
    const { data: recital, error: recitalError } = await client
      .from('recitals')
      .select('id')
      .eq('id', recitalId)
      .single()
    
    if (recitalError) {
      console.error('Error fetching recital:', recitalError)
      return createError({
        statusCode: 404,
        statusMessage: 'Recital not found'
      })
    }
    
    // Get the current performances to verify they all exist
    const { data: currentPerformances, error: perfError } = await client
      .from('recital_performances')
      .select('id')
      .eq('recital_id', recitalId)
    
    if (perfError) throw perfError
    
    // Create a Set of current performance IDs for quick lookup
    const currentPerfIds = new Set(currentPerformances.map(p => p.id))
    
    // Validate that all IDs in the provided order exist in the database
    const invalidIds = body.performanceOrder.filter(id => !currentPerfIds.has(id))
    
    if (invalidIds.length > 0) {
      return createError({
        statusCode: 400,
        statusMessage: `Some performance IDs do not exist: ${invalidIds.join(', ')}`
      })
    }
    
    // Also check if the number of performances matches
    if (body.performanceOrder.length !== currentPerformances.length) {
      return createError({
        statusCode: 400,
        statusMessage: 'Performance order list does not include all performances'
      })
    }
    
    // Update each performance with its new order
    const updatePromises = body.performanceOrder.map((perfId, index) => {
      return client
        .from('recital_performances')
        .update({ performance_order: index })
        .eq('id', perfId)
    })
    
    // Execute all updates
    await Promise.all(updatePromises)
    
    // Fetch the updated performances
    const { data: updatedPerformances, error: updateError } = await client
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
            dance_style:dance_style_id (id, name, color)
          )
        )
      `)
      .eq('recital_id', recitalId)
      .order('performance_order')
    
    if (updateError) throw updateError
    
    return {
      message: 'Performance order updated successfully',
      performances: updatedPerformances
    }
  } catch (error) {
    console.error('Update performance order API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update performance order'
    })
  }
})