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
    
    if (!body.note && body.note !== '') {
      return createError({
        statusCode: 400,
        statusMessage: 'Artistic director note is required'
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
          artistic_director_note: body.note
        })
        .eq('id', existingProgram.id)
        .select()
      
      if (error) throw error
      result = { updated: true, program: data[0] }
    } else {
      // Create new program if it doesn't exist
      const { data, error } = await client
        .from('recital_programs')
        .insert([{
          recital_id: recitalId,
          artistic_director_note: body.note
        }])
        .select()
      
      if (error) throw error
      result = { created: true, program: data[0] }
    }
    
    return {
      message: 'Artistic director note updated successfully',
      ...result
    }
  } catch (error) {
    console.error('Update artistic note API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update artistic director note'
    })
  }
})