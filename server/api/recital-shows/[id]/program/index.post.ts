// server/api/recital-shows/[id]/program/index.post.ts
import { getSupabaseClient } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    // Check if program already exists
    const { data: existingProgram, error: checkError } = await client
      .from('recital_programs')
      .select('id')
      .eq('recital_id', id)
      .maybeSingle()
    
    if (checkError) throw checkError
    
    let result
    let actionType = 'created'
    
    // If program exists, update it
    if (existingProgram) {
      const { data, error } = await client
        .from('recital_programs')
        .update(body)
        .eq('id', existingProgram.id)
        .select()
      
      if (error) throw error
      result = data[0]
      actionType = 'updated'
    } 
    // Otherwise create new program
    else {
      const { data, error } = await client
        .from('recital_programs')
        .insert([{ ...body, recital_id: id }])
        .select()
      
      if (error) throw error
      result = data[0]
    }
    
    return {
      [actionType]: true,
      program: result
    }
  } catch (error) {
    console.error('Program API (POST) error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update program details'
    })
  }
})