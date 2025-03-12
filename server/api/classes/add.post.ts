// server/api/classes/add.post.ts
import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.name || !body.dance_style_id) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    // Insert the new class
    const { data, error } = await client
      .from('class_definitions')
      .insert([body])
      .select()
    
    if (error) throw error
    
    return {
      message: 'Class created successfully',
      class: data[0]
    }
  } catch (error) {
    console.error('Add class API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create class'
    })
  }
})