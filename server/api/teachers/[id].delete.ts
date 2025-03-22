import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    
    // Begin a transaction to ensure all operations succeed or fail together
    // Unfortunately, Supabase JS client doesn't support explicit transactions
    // so we'll do this as separate operations
    
    // 1. First, delete all availability exceptions
    const { error: exceptionsError } = await client
      .from('teacher_availability_exceptions')
      .delete()
      .eq('teacher_id', id)
    
    if (exceptionsError) throw exceptionsError
    
    // 2. Delete regular availability entries
    const { error: availabilityError } = await client
      .from('teacher_availability')
      .delete()
      .eq('teacher_id', id)
    
    if (availabilityError) throw availabilityError
    
    // 3. Delete any class instances where this teacher is assigned
    // You might want to just set the teacher_id to null instead of deleting classes
    const { error: classInstanceError } = await client
      .from('class_instances')
      .update({ teacher_id: null })
      .eq('teacher_id', id)
    
    if (classInstanceError) throw classInstanceError
    
    // 4. Update schedule_classes where this teacher is assigned
    const { error: scheduleClassError } = await client
      .from('schedule_classes')
      .update({ teacher_id: null })
      .eq('teacher_id', id)
    
    if (scheduleClassError) throw scheduleClassError
    
    // 5. Finally, delete the teacher
    const { error } = await client
      .from('teachers')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return {
      message: 'Teacher deleted successfully'
    }
  } catch (error) {
    console.error('Delete teacher API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete teacher'
    })
  }
})