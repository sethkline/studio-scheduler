// server/api/recital-shows/[id]/performances/[performanceId]/index.delete.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '~/server/utils/supabase'
import { getUserSupabaseClient } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const recitalId = getRouterParam(event, 'id')
    const performanceId = getRouterParam(event, 'performanceId')
    
    // Validate that the performance belongs to this recital
    const { data: performance, error: checkError } = await client
      .from('recital_performances')
      .select('id, performance_order')
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
    
    // Delete the performance
    const { error: deleteError } = await client
      .from('recital_performances')
      .delete()
      .eq('id', performanceId)
    
    if (deleteError) throw deleteError
    
    // Get remaining performances and reorder them
    const { data: remainingPerformances, error: fetchError } = await client
      .from('recital_performances')
      .select('id, performance_order')
      .eq('recital_id', recitalId)
      .order('performance_order')
    
    if (fetchError) throw fetchError
    
    // Reorder remaining performances if needed
    for (let i = 0; i < remainingPerformances.length; i++) {
      // Only update if order has changed
      if (remainingPerformances[i].performance_order !== i) {
        const { error: updateError } = await client
          .from('recital_performances')
          .update({ performance_order: i })
          .eq('id', remainingPerformances[i].id)
        
        if (updateError) throw updateError
      }
    }
    
    return {
      message: 'Performance deleted successfully'
    }
  } catch (error) {
    console.error('Delete performance error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete performance'
    })
  }
})