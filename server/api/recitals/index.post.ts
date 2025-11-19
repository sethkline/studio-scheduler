import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  
  try {
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.name || !body.date || !body.location || !body.status) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    // Insert the new recital
    const { data, error } = await client
      .from('recitals')
      .insert([body])
      .select()
    
    if (error) throw error
    
    return {
      message: 'Recital created successfully',
      recital: data[0]
    }
  } catch (error) {
    console.error('Create recital API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create recital'
    })
  }
})