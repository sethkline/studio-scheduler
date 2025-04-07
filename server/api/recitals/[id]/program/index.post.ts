import { getSupabaseClient } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const recitalId = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    if (!recitalId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Recital ID is required'
      })
    }
    
    // First, check if the recital exists
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
    
    // Check if a program already exists for this recital
    const { data: existingProgram, error: programError } = await client
      .from('recital_programs')
      .select('id')
      .eq('recital_id', recitalId)
      .single()
    
    let result
    
    if (existingProgram) {
      // Update existing program
      const { data, error } = await client
        .from('recital_programs')
        .update({
          artistic_director_note: body.artistic_director_note,
          acknowledgments: body.acknowledgments,
          // Don't update cover_image_url here, we'll use a separate endpoint for that
        })
        .eq('id', existingProgram.id)
        .select()
      
      if (error) throw error
      result = { updated: true, program: data[0] }
    } else {
      // Create new program
      const { data, error } = await client
        .from('recital_programs')
        .insert([{
          recital_id: recitalId,
          artistic_director_note: body.artistic_director_note,
          acknowledgments: body.acknowledgments
        }])
        .select()
      
      if (error) throw error
      result = { created: true, program: data[0] }
    }
    
    return result
  } catch (error) {
    console.error('Update recital program API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update recital program'
    })
  }
})