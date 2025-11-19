// server/api/recital-shows/add.post.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const rawBody = await readBody(event)
    
    // Clean the body data - convert empty strings to null
    const body = Object.entries(rawBody).reduce((acc, [key, value]) => {
      acc[key] = value === '' ? null : value;
      return acc;
    }, {});
    
    // Validate required fields
    if (!body.name || !body.date || !body.start_time || !body.series_id) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    // Insert the new recital show
    const { data, error } = await client
      .from('recital_shows')
      .insert([body])
      .select()
    
    if (error) throw error
    
    return {
      message: 'Recital show created successfully',
      show: data[0]
    }
  } catch (error) {
    console.error('Add recital show API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create recital show'
    })
  }
})