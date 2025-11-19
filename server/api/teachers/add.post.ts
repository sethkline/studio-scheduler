import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.first_name || !body.last_name) {
      return createError({
        statusCode: 400,
        statusMessage: 'First name and last name are required'
      })
    }
    
    const { data, error } = await client
      .from('teachers')
      .insert([body])
      .select()
    
    if (error) throw error
    
    return {
      message: 'Teacher created successfully',
      teacher: data[0]
    }
  } catch (error) {
    console.error('Add teacher API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create teacher'
    })
  }
})