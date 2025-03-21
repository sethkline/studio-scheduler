import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.class_definition_id) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    // Insert the new class instance
    const { data, error } = await client
      .from('class_instances')
      .insert([body])
      .select()
    
    if (error) throw error
    
    return {
      message: 'Class instance created successfully',
      classInstance: data[0]
    }
  } catch (error) {
    console.error('Add class instance API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create class instance'
    })
  }
})