import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')
  
  // Validate ID
  if (!id) {
    return createError({
      statusCode: 400,
      statusMessage: 'Recital ID is required'
    })
  }
  
  try {
    // Fetch recital data
    const { data: recital, error } = await client
      .from('recitals')
      .select(`
        id,
        name,
        description,
        date,
        location,
        notes,
        status,
        theme,
        program_notes,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return createError({
          statusCode: 404,
          statusMessage: 'Recital not found'
        })
      }
      throw error
    }
    
    // Check if recital has a program
    const { data: program, error: programError } = await client
      .from('recital_programs')
      .select('id')
      .eq('recital_id', id)
      .maybeSingle()
    
    if (programError) throw programError
    
    return {
      ...recital,
      has_program: !!program
    }
  } catch (error) {
    console.error('Fetch recital API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch recital'
    })
  }
})