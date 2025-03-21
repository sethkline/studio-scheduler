import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.sourceScheduleId || !body.newName || !body.newStartDate || !body.newEndDate) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    // 1. Get the source schedule
    const { data: sourceSchedule, error: sourceError } = await client
      .from('schedules')
      .select('*')
      .eq('id', body.sourceScheduleId)
      .single()
    
    if (sourceError) throw sourceError
    
    // 2. Create a new schedule based on the source
    const newSchedule = {
      name: body.newName,
      description: body.newDescription || sourceSchedule.description,
      start_date: body.newStartDate,
      end_date: body.newEndDate,
      is_active: body.isActive || false
    }
    
    const { data: createdSchedule, error: createError } = await client
      .from('schedules')
      .insert([newSchedule])
      .select()
    
    if (createError) throw createError
    
    // If cloneCourses is true, also duplicate the schedule classes
    if (body.cloneClasses) {
      // 3. Get all classes from the source schedule
      const { data: sourceClasses, error: classesError } = await client
        .from('schedule_classes')
        .select('*')
        .eq('schedule_id', body.sourceScheduleId)
      
      if (classesError) throw classesError
      
      if (sourceClasses && sourceClasses.length > 0) {
        // 4. Prepare new classes for the duplicated schedule
        const newClasses = sourceClasses.map(sourceClass => ({
          schedule_id: createdSchedule[0].id,
          class_instance_id: sourceClass.class_instance_id,
          day_of_week: sourceClass.day_of_week,
          start_time: sourceClass.start_time,
          end_time: sourceClass.end_time,
          studio_id: sourceClass.studio_id,
          teacher_id: sourceClass.teacher_id
        }))
        
        // 5. Insert all new classes
        const { error: insertError } = await client
          .from('schedule_classes')
          .insert(newClasses)
        
        if (insertError) throw insertError
      }
    }
    
    return {
      message: 'Schedule duplicated successfully',
      schedule: createdSchedule[0]
    }
  } catch (error) {
    console.error('Duplicate schedule API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to duplicate schedule'
    })
  }
})