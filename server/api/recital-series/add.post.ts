// server/api/recital-series/add.post.ts
import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  console.log('Add recital series API called')
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.name || !body.year) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    // Insert the new recital series
    const { data, error } = await client
      .from('recital_series')
      .insert([body])
      .select()
    
    if (error) throw error
    
    return {
      message: 'Recital series created successfully',
      series: data[0]
    }
  } catch (error) {
    console.error('Add recital series API error:', {
      message: error?.message || 'Failed to create recital series',
      details: error?.details || [],
      hint: error?.hint || [],
      code: error?.code || '',
      fullError: JSON.stringify(error, null, 2)
    })
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create recital series'
    })
  }
})