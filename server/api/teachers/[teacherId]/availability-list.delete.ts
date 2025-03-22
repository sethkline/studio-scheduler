// server/api/teachers/[teacherId]/availability-list.delete.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const teacherId = getRouterParam(event, 'teacherId')
    const body = await readBody(event)
    const id = body.id
    
    if (!id) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing availability ID'
      })
    }
    
    // Validate teacher_id matches
    const { data: existingAvailability, error: fetchError } = await client
      .from('teacher_availability')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError) throw fetchError
    
    if (existingAvailability.teacher_id !== teacherId) {
      return createError({
        statusCode: 403,
        statusMessage: 'Unauthorized access to availability record'
      })
    }
    
    const { error } = await client
      .from('teacher_availability')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return {
      message: 'Availability deleted successfully'
    }
  } catch (error) {
    console.error('Delete availability API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete availability'
    })
  }
})