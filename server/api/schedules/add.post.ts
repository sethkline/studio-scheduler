import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.name || !body.start_date || !body.end_date) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    // Insert the new schedule
    const { data, error } = await client
      .from('schedules')
      .insert([body])
      .select()
    
    if (error) throw error
    
    return {
      message: 'Schedule created successfully',
      schedule: data[0]
    }
  } catch (error) {
    console.error('Add schedule API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create schedule'
    })
  }
})