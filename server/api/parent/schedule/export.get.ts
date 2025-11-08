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

    // Get all active enrollments for these students with class details
    const { data: enrollments, error: enrollmentsError } = await client
      .from('enrollments')
      .select(`
        *,
        student:students(id, first_name, last_name),
        class_instance:class_instances(
          id,
          name,
          schedule_classes(
            id,
            day_of_week,
            start_time,
            end_time,
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

    // Transform into schedule events
    const scheduleEvents = enrollments
      ?.filter((enrollment: any) => enrollment.class_instance)
      .flatMap((enrollment: any) => {
        const classInstance = enrollment.class_instance
        const scheduleClasses = classInstance.schedule_classes || []

        return scheduleClasses.map((sc: any) => ({
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
        }))
      }) || []

    // Generate iCalendar content
    const icsLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//${studio?.name || 'Dance Studio'}//Class Schedule//EN`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${studio?.name || 'Dance Studio'} - Class Schedule`,
      'X-WR-TIMEZONE:America/New_York',
      'X-WR-CALDESC:Dance class schedule for ' + (studentId ? 'student' : 'all students'),
    ]

    // Generate recurring events for the next 6 months
    const today = new Date()
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
    const endDate = new Date(today.getFullYear(), today.getMonth() + 6, 0)

    scheduleEvents.forEach((scheduleEvent, index) => {
      // Generate RRULE for recurring events
      const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
      const byDay = dayMap[scheduleEvent.day_of_week]

      // Find the first occurrence
      let firstOccurrence = new Date(startDate)
      while (firstOccurrence.getDay() !== scheduleEvent.day_of_week) {
        firstOccurrence.setDate(firstOccurrence.getDate() + 1)
      }

      const [startHour, startMin] = scheduleEvent.start_time.split(':').map(Number)
      const [endHour, endMin] = scheduleEvent.end_time.split(':').map(Number)

      const dtstart = new Date(firstOccurrence)
      dtstart.setHours(startHour, startMin, 0)

      const dtend = new Date(firstOccurrence)
      dtend.setHours(endHour, endMin, 0)

      const until = new Date(endDate)
      until.setHours(23, 59, 59)

      // Format dates for iCal (YYYYMMDDTHHMMSS)
      const formatICalDate = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hour = String(date.getHours()).padStart(2, '0')
        const minute = String(date.getMinutes()).padStart(2, '0')
        const second = String(date.getSeconds()).padStart(2, '0')
        return `${year}${month}${day}T${hour}${minute}${second}`
      }

      const uid = `class-${index}-${Date.now()}@${studio?.name?.replace(/\s+/g, '-').toLowerCase() || 'studio'}.com`

      icsLines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatICalDate(new Date())}`,
        `DTSTART:${formatICalDate(dtstart)}`,
        `DTEND:${formatICalDate(dtend)}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${formatICalDate(until)}`,
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
