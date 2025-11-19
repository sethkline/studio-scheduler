export default defineEventHandler(async (event) => {
  try {
    // Public endpoint - querying public data only

    // Public endpoint - querying public data only


    const client = getSupabaseClient()
    const query = getQuery(event)
    
    // Get studio identification TODO in future
    const studioId = query.studioId as string
    
    // Build the base query
    let classQuery = client
      .from('class_definitions')
      .select(`
        id, name, description, min_age, max_age, duration, max_students,
        dance_style:dance_style_id (id, name, color),
        class_level:class_level_id (id, name),
        class_instances(
          id, name, status,
          schedule_classes(
            id, day_of_week, start_time, end_time, 
            studio:studio_id(id, name)
          )
        )
      `)
      .eq('class_instances.status', 'active')
    
    // Apply studio filter if provided
    if (studioId) {
      classQuery = classQuery.eq('studio_id', studioId)
    }
    
    // Execute the query
    const { data, error } = await classQuery
    
    if (error) throw error
    
    // Transform and return data
    return { classes: data }
  } catch (error) {
    console.error('Classes API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch classes'
    })
  }
})