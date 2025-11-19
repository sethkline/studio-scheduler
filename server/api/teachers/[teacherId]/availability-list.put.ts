import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
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
    
    // Remove the id from body before updating
    const updateData = { ...body }
    delete updateData.id
    
    const { data, error } = await client
      .from('teacher_availability')
      .update(updateData)
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    return {
      message: 'Availability updated successfully',
      availability: data[0]
    }
  } catch (error) {
    console.error('Update availability API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update availability'
    })
  }
})