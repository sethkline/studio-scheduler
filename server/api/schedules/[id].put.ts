import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    const { data, error } = await client
      .from('schedules')
      .update(body)
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    return {
      message: 'Schedule updated successfully',
      schedule: data[0]
    }
  } catch (error) {
    console.error('Update schedule API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update schedule'
    })
  }
})