import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.name) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    const { data, error } = await client
      .from('class_levels')
      .insert([body])
      .select()
    
    if (error) throw error
    
    return {
      message: 'Class level created successfully',
      classLevel: data[0]
    }
  } catch (error) {
    console.error('Add class level API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create class level'
    })
  }
})