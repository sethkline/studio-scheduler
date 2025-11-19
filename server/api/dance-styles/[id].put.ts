import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    const { data, error } = await client
      .from('dance_styles')
      .update(body)
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    return {
      message: 'Dance style updated successfully',
      danceStyle: data[0]
    }
  } catch (error) {
    console.error('Update dance style API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update dance style'
    })
  }
})