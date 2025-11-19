import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const teacherId = getRouterParam(event, 'teacherId')
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    // Validate teacher_id matches
    const { data: existingException, error: fetchError } = await client
      .from('teacher_availability_exceptions')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError) throw fetchError
    
    if (existingException.teacher_id !== teacherId) {
      return createError({
        statusCode: 403,
        statusMessage: 'Unauthorized access to exception record'
      })
    }
    
    const { data, error } = await client
      .from('teacher_availability_exceptions')
      .update(body)
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    return {
      message: 'Exception updated successfully',
      exception: data[0]
    }
  } catch (error) {
    console.error('Update exception API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update availability exception'
    })
  }
})