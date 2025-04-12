// server/api/recital-shows/[id]/program/acknowledgments.put.ts
import { getSupabaseClient } from '../../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    if (!body.acknowledgments) {
      return createError({
        statusCode: 400,
        statusMessage: 'Acknowledgments content is required'
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
    
    // If program exists, update the acknowledgments
    if (existingProgram) {
      const { data, error } = await client
        .from('recital_programs')
        .update({ acknowledgments: body.acknowledgments })
        .eq('id', existingProgram.id)
        .select()
      
      if (error) throw error
      programResult = data[0]
      actionType = 'updated'
    } 
    // Otherwise create new program with acknowledgments
    else {
      const { data, error } = await client
        .from('recital_programs')
        .insert([{ 
          recital_id: id, 
          acknowledgments: body.acknowledgments
        }])
        .select()
      
      if (error) throw error
      programResult = data[0]
    }
    
    return {
      message: 'Acknowledgments updated successfully',
      [actionType]: true,
      program: programResult
    }
  } catch (error) {
    console.error('Update acknowledgments error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update acknowledgments'
    })
  }
})