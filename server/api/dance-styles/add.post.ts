import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.name || !body.color) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    const { data, error } = await client
      .from('dance_styles')
      .insert([body])
      .select()
    
    if (error) throw error
    
    return {
      message: 'Dance style created successfully',
      danceStyle: data[0]
    }
  } catch (error) {
    console.error('Add dance style API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create dance style'
    })
  }
})