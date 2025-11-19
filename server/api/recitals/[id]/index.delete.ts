import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const id = getRouterParam(event, 'id')
  
  // Validate ID
  if (!id) {
    return createError({
      statusCode: 400,
      statusMessage: 'Recital ID is required'
    })
  }
  
  try {
    // Check for dependencies before deleting
    // 1. Check for recital performances
    const { count: performanceCount, error: performanceError } = await client
      .from('recital_performances')
      .select('id', { count: 'exact', head: true })
      .eq('recital_id', id)
    
    if (performanceError) throw performanceError
    
    if (performanceCount > 0) {
      // Delete all performances first
      const { error: deletePerformancesError } = await client
        .from('recital_performances')
        .delete()
        .eq('recital_id', id)
      
      if (deletePerformancesError) throw deletePerformancesError
    }
    
    // 2. Check for recital program
    const { data: program, error: programError } = await client
      .from('recital_programs')
      .select('id')
      .eq('recital_id', id)
      .maybeSingle()
    
    if (programError) throw programError
    
    if (program) {
      // 2.1 Check for program advertisements
      const { error: deleteAdsError } = await client
        .from('recital_program_advertisements')
        .delete()
        .eq('recital_program_id', program.id)
      
      if (deleteAdsError) throw deleteAdsError
      
      // 2.2 Delete the program
      const { error: deleteProgramError } = await client
        .from('recital_programs')
        .delete()
        .eq('id', program.id)
      
      if (deleteProgramError) throw deleteProgramError
    }
    
    // Finally delete the recital
    const { error } = await client
      .from('recitals')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return {
      message: 'Recital deleted successfully'
    }
  } catch (error) {
    console.error('Delete recital API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete recital'
    })
  }
})