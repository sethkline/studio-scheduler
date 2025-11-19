// server/api/recital-shows/[id]/program/[type].put.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    const type = getRouterParam(event, 'type')
    const body = await readBody(event)
    
    if (!body.content) {
      return createError({
        statusCode: 400,
        statusMessage: 'Content is required'
      })
    }
    
    // Validate content type
    const validTypes = ['artistic-note', 'acknowledgments', 'program-notes']
    if (!validTypes.includes(type)) {
      return createError({
        statusCode: 400,
        statusMessage: 'Invalid content type'
      })
    }
    
    // Map route type to database field
    const fieldMap = {
      'artistic-note': 'artistic_director_note',
      'acknowledgments': 'acknowledgments',
      'program-notes': 'program_notes'
    }
    
    const field = fieldMap[type]
    
    // Check if program already exists
    const { data: existingProgram, error: checkError } = await client
      .from('recital_programs')
      .select('id')
      .eq('recital_id', id)
      .maybeSingle()
    
    if (checkError) throw checkError
    
    let programResult
    let actionType = 'created'
    
    // If program exists, update the specified field
    if (existingProgram) {
      const { data, error } = await client
        .from('recital_programs')
        .update({ [field]: body.content })
        .eq('id', existingProgram.id)
        .select()
      
      if (error) throw error
      programResult = data[0]
      actionType = 'updated'
    } 
    // Otherwise create new program with the content
    else {
      const { data, error } = await client
        .from('recital_programs')
        .insert([{ 
          recital_id: id, 
          [field]: body.content
        }])
        .select()
      
      if (error) throw error
      programResult = data[0]
    }
    
    return {
      message: `${type.replace('-', ' ')} updated successfully`,
      [actionType]: true,
      program: programResult
    }
  } catch (error) {
    console.error('Update program content error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update program content'
    })
  }
})