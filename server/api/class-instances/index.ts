import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)
    
    let classInstancesQuery = client.from('class_instances').select('*')
    
    // Apply filters if provided
    if (query.class_definition_id) {
      classInstancesQuery = classInstancesQuery.eq('class_definition_id', query.class_definition_id)
    }
    
    if (query.teacher_id) {
      classInstancesQuery = classInstancesQuery.eq('teacher_id', query.teacher_id)
    }
    
    if (query.status) {
      classInstancesQuery = classInstancesQuery.eq('status', query.status)
    }
    
    const { data, error } = await classInstancesQuery
    
    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Class instances API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch class instances'
    })
  }
})