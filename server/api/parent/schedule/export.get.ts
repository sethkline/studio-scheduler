import { getSupabaseClient } from '../../../utils/supabase'

/**
 * Export parent schedule as iCalendar (.ics) file
 * Supports filtering by student
 */
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  try {
    const query = getQuery(event)
    const studentId = query.student_id as string | undefined

    // Get guardian record for this user
    const { data: guardian, error: guardianError } = await client
      .from('guardians')
      .select('id, first_name, last_name')
      .eq('user_id', user.id)
      .single()

    if (guardianError || !guardian) {
      throw createError({
        statusCode: 404,
        message: 'Guardian profile not found',
      })
    }

    // Get studio profile for calendar name
    const { data: studio } = await client
      .from('studio_profile')
      .select('name')
      .single()

    // Get all students linked to this guardian or specific student
    let studentQuery = client
      .from('student_guardian_relationships')
      .select('student_id')
      .eq('guardian_id', guardian.id)

    if (studentId) {
      studentQuery = studentQuery.eq('student_id', studentId)
    }

    const { data: relationships, error: relationshipsError } = await studentQuery

    if (relationshipsError) throw relationshipsError

    const studentIds = relationships?.map((rel: any) => rel.student_id) || []

    if (studentIds.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'No students found',
      })
    }

    // Get all active enrollments for these students with class details including schedule dates
    const { data: enrollments, error: enrollmentsError } = await client
      .from('enrollments')
      .select(`
        *,
        student:students(id, first_name, last_name),
        class_instance:class_instances(
          id,
          name,
          schedule_id,
          schedule_classes(
            id,
            day_of_week,
            start_time,
            end_time,
            schedule_id,
            studio_room:studio_rooms(name, location)
          ),
          class_definition:class_definitions(
            name,
            description,
            dance_style:dance_styles(name, color)
          ),
          teacher:profiles(id, first_name, last_name)
        )
      `)
      .in('student_id', studentIds)
      .eq('status', 'active')

    if (enrollmentsError) throw enrollmentsError

    // Get schedule dates for all schedules referenced in the enrollments
    const scheduleIds = new Set<string>()
    enrollments?.forEach((enrollment: any) => {
      const scheduleId = enrollment.class_instance?.schedule_id
      if (scheduleId) {
        scheduleIds.add(scheduleId)
      }
      enrollment.class_instance?.schedule_classes?.forEach((sc: any) => {
        if (sc.schedule_id) {
          scheduleIds.add(sc.schedule_id)
        }
      })
    })

    const scheduleIdArray = Array.from(scheduleIds)
    let schedulesMap = new Map<string, { start_date: string; end_date: string }>()

    if (scheduleIdArray.length > 0) {
      const { data: schedules } = await client
        .from('schedules')
        .select('id, start_date, end_date')
        .in('id', scheduleIdArray)

      schedules?.forEach((schedule: any) => {
        schedulesMap.set(schedule.id, {
          start_date: schedule.start_date,
          end_date: schedule.end_date,
        })
      })
    }

    // Transform into schedule events with schedule dates
    const scheduleEvents = enrollments
      ?.filter((enrollment: any) => enrollment.class_instance)
      .flatMap((enrollment: any) => {
        const classInstance = enrollment.class_instance
        const scheduleClasses = classInstance.schedule_classes || []

        return scheduleClasses.map((sc: any) => {
          // Get schedule dates from the schedule_class's schedule_id or class_instance's schedule_id
          const scheduleId = sc.schedule_id || classInstance.schedule_id
          const scheduleDates = scheduleId ? schedulesMap.get(scheduleId) : null

          return {
            enrollment_id: enrollment.id,
            schedule_class_id: sc.id,
            student_id: enrollment.student.id,
            student_name: `${enrollment.student.first_name} ${enrollment.student.last_name}`,
            class_name: classInstance.class_definition?.name || classInstance.name,
            description: classInstance.class_definition?.description || '',
            day_of_week: sc.day_of_week,
            start_time: sc.start_time,
            end_time: sc.end_time,
            location: sc.studio_room?.name || 'TBA',
            teacher_name: classInstance.teacher
              ? `${classInstance.teacher.first_name} ${classInstance.teacher.last_name}`
              : 'TBA',
            dance_style: classInstance.class_definition?.dance_style?.name || '',
            schedule_start_date: scheduleDates?.start_date,
            schedule_end_date: scheduleDates?.end_date,
          }
        })
      }) || []

    // Generate iCalendar content
    const icsLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//${studio?.name || 'Dance Studio'}//Class Schedule//EN`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${studio?.name || 'Dance Studio'} - Class Schedule`,
      'X-WR-CALDESC:Dance class schedule for ' + (studentId ? 'student' : 'all students'),
    ]

    // Helper to format dates in UTC for iCal (YYYYMMDDTHHMMSSZ)
    const formatICalDateUTC = (date: Date): string => {
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      const hour = String(date.getUTCHours()).padStart(2, '0')
      const minute = String(date.getUTCMinutes()).padStart(2, '0')
      const second = String(date.getUTCSeconds()).padStart(2, '0')
      return `${year}${month}${day}T${hour}${minute}${second}Z`
    }

    // Helper to format date-only values for UNTIL (YYYYMMDD)
    const formatICalDateOnly = (date: Date): string => {
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      return `${year}${month}${day}`
    }

    scheduleEvents.forEach((scheduleEvent) => {
      // Use schedule dates if available, otherwise fallback to reasonable defaults
      const today = new Date()
      const scheduleStartDate = scheduleEvent.schedule_start_date
        ? new Date(scheduleEvent.schedule_start_date)
        : new Date(today.getFullYear(), today.getMonth(), 1)
      const scheduleEndDate = scheduleEvent.schedule_end_date
        ? new Date(scheduleEvent.schedule_end_date)
        : new Date(today.getFullYear(), today.getMonth() + 6, 0)

      // Generate RRULE for recurring events
      const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
      const byDay = dayMap[scheduleEvent.day_of_week]

      // Find the first occurrence on or after schedule start date
      let firstOccurrence = new Date(scheduleStartDate)
      while (firstOccurrence.getDay() !== scheduleEvent.day_of_week) {
        firstOccurrence.setUTCDate(firstOccurrence.getUTCDate() + 1)
      }

      // If first occurrence is after schedule end date, skip this event
      if (firstOccurrence > scheduleEndDate) {
        return
      }

      const [startHour, startMin] = scheduleEvent.start_time.split(':').map(Number)
      const [endHour, endMin] = scheduleEvent.end_time.split(':').map(Number)

      // Create UTC dates for start and end times
      const dtstart = new Date(firstOccurrence)
      dtstart.setUTCHours(startHour, startMin, 0, 0)

      const dtend = new Date(firstOccurrence)
      dtend.setUTCHours(endHour, endMin, 0, 0)

      // UNTIL date should be at end of day in UTC
      const until = new Date(scheduleEndDate)
      until.setUTCHours(23, 59, 59, 999)

      // Create deterministic UID based on enrollment, schedule_class, and student
      // This ensures the same event always has the same UID
      const uid = `${scheduleEvent.enrollment_id}-${scheduleEvent.schedule_class_id}-${scheduleEvent.student_id}@${studio?.name?.replace(/\s+/g, '-').toLowerCase() || 'studio'}.com`

      icsLines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatICalDateUTC(new Date())}`,
        `DTSTART:${formatICalDateUTC(dtstart)}`,
        `DTEND:${formatICalDateUTC(dtend)}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${formatICalDateOnly(until)}`,
        `SUMMARY:${scheduleEvent.class_name}${scheduleEvent.student_name ? ' - ' + scheduleEvent.student_name : ''}`,
        `DESCRIPTION:${scheduleEvent.description || scheduleEvent.class_name}\\nTeacher: ${scheduleEvent.teacher_name}\\nDance Style: ${scheduleEvent.dance_style}`,
        `LOCATION:${scheduleEvent.location}`,
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'END:VEVENT',
      )
    })

    icsLines.push('END:VCALENDAR')

    const icsContent = icsLines.join('\r\n')

    // Set headers for file download
    const filename = studentId
      ? `class-schedule-student-${studentId}.ics`
      : `class-schedule-all-students.ics`

    setResponseHeaders(event, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    })

    return icsContent
  } catch (error: any) {
    console.error('Error exporting schedule:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to export schedule',
    })
  }
})
