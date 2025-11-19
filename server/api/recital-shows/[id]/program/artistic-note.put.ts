import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    if (!body.note) {
      return createError({
        statusCode: 400,
        statusMessage: 'Note content is required'
      })
    }
    
    // Check if program already exists
    const { data: existingProgram, error: checkError } = await client
      .from('recital_programs')
      .select('id')
      .eq('recital_id', id)
      .maybeSingle()
    
    if (checkError) throw checkError
    
    let programResult
    let actionType = 'created'
    
    // If program exists, update the artistic director note
    if (existingProgram) {
      const { data, error } = await client
        .from('recital_programs')
        .update({ artistic_director_note: body.note })
        .eq('id', existingProgram.id)
        .select()
      
      if (error) throw error
      programResult = data[0]
      actionType = 'updated'
    } 
    // Otherwise create new program with note
    else {
      const { data, error } = await client
        .from('recital_programs')
        .insert([{ 
          recital_id: id, 
          artistic_director_note: body.note
        }])
        .select()
      
      if (error) throw error
      programResult = data[0]
    }
    
    return {
      message: 'Artistic director note updated successfully',
      [actionType]: true,
      program: programResult
    }
  } catch (error) {
    console.error('Update artistic note error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update artistic director note'
    })
  }
})