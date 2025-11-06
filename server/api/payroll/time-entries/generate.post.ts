// server/api/payroll/time-entries/generate.post.ts
import { getSupabaseClient } from '../../../utils/supabase'

/**
 * Generate time entries from scheduled classes for a payroll period
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)

    if (!body.payroll_period_id) {
      throw createError({
        statusCode: 400,
        message: 'Payroll period ID is required'
      })
    }

    // Get payroll period details
    const { data: period, error: periodError } = await client
      .from('payroll_periods')
      .select('*')
      .eq('id', body.payroll_period_id)
      .single()

    if (periodError || !period) {
      throw createError({
        statusCode: 404,
        message: 'Payroll period not found'
      })
    }

    // Get schedule_id from body or use active schedule
    let scheduleId = body.schedule_id
    if (!scheduleId) {
      const { data: activeSchedule } = await client
        .from('schedules')
        .select('id')
        .eq('is_active', true)
        .single()

      scheduleId = activeSchedule?.id
    }

    if (!scheduleId) {
      throw createError({
        statusCode: 400,
        message: 'No active schedule found. Please specify a schedule_id'
      })
    }

    // Get all scheduled classes with teacher assignments
    const { data: scheduleClasses, error: classesError } = await client
      .from('schedule_classes')
      .select(`
        *,
        class_instance:class_instances(
          id,
          teacher_id,
          class_definition:class_definitions(duration)
        )
      `)
      .eq('schedule_id', scheduleId)

    if (classesError) throw classesError

    if (!scheduleClasses || scheduleClasses.length === 0) {
      return {
        success: true,
        message: 'No scheduled classes found for this schedule',
        data: { entries_created: 0 }
      }
    }

    // Calculate which days fall within the payroll period
    const startDate = new Date(period.start_date)
    const endDate = new Date(period.end_date)
    const timeEntries = []

    // For each scheduled class, create time entries for each occurrence within the period
    for (const scheduleClass of scheduleClasses) {
      const classInstance = scheduleClass.class_instance
      if (!classInstance || !classInstance.teacher_id) continue

      const dayOfWeek = scheduleClass.day_of_week
      const startTime = scheduleClass.start_time
      const endTime = scheduleClass.end_time

      // Calculate hours (assuming start_time and end_time are in HH:MM:SS format)
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)
      const hours = (endHour * 60 + endMin - startHour * 60 - startMin) / 60

      // Find all dates with this day of week in the period
      let currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        if (currentDate.getDay() === dayOfWeek) {
          // Check if entry already exists
          const { data: existingEntry } = await client
            .from('payroll_time_entries')
            .select('id')
            .eq('payroll_period_id', body.payroll_period_id)
            .eq('teacher_id', classInstance.teacher_id)
            .eq('schedule_class_id', scheduleClass.id)
            .eq('entry_date', currentDate.toISOString().split('T')[0])
            .single()

          if (!existingEntry) {
            timeEntries.push({
              payroll_period_id: body.payroll_period_id,
              teacher_id: classInstance.teacher_id,
              entry_date: currentDate.toISOString().split('T')[0],
              start_time: startTime,
              end_time: endTime,
              hours: hours,
              entry_type: 'scheduled',
              schedule_class_id: scheduleClass.id,
              class_instance_id: classInstance.id,
              is_substitute: false,
              status: 'pending'
            })
          }
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }

    // Insert all time entries
    if (timeEntries.length > 0) {
      const { data: insertedEntries, error: insertError } = await client
        .from('payroll_time_entries')
        .insert(timeEntries)
        .select()

      if (insertError) throw insertError

      return {
        success: true,
        message: `Generated ${insertedEntries.length} time entries`,
        data: {
          entries_created: insertedEntries.length,
          entries: insertedEntries
        }
      }
    } else {
      return {
        success: true,
        message: 'All time entries already exist for this period',
        data: { entries_created: 0 }
      }
    }
  } catch (error: any) {
    console.error('Generate time entries error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to generate time entries'
    })
  }
})
