import { getSupabaseClient } from '../../../utils/supabase'

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
    const classInstanceId = query.class_instance_id as string | undefined

    const today = new Date()
    const todayDate = today.toISOString().split('T')[0]
    const dayOfWeek = today.getDay()

    // Build the query for today's schedule
    let scheduleQuery = client
      .from('schedule_classes')
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        class_instance:class_instances!inner(
          id,
          name,
          dance_style:dance_styles(
            name,
            color
          ),
          teacher:profiles(
            id,
            first_name,
            last_name
          ),
          enrollments!inner(
            id,
            student_id,
            status,
            student:students(
              id,
              first_name,
              last_name,
              photo_url,
              allergies,
              medical_conditions,
              emergency_contact_name,
              emergency_contact_phone
            )
          )
        )
      `)
      .eq('day_of_week', dayOfWeek)

    if (classInstanceId) {
      scheduleQuery = scheduleQuery.eq('class_instance_id', classInstanceId)
    }

    const { data: scheduleClasses, error: scheduleError } = await scheduleQuery

    if (scheduleError) throw scheduleError

    // Get today's attendance records
    const { data: attendanceRecords, error: attendanceError } = await client
      .from('attendance')
      .select('*')
      .eq('attendance_date', todayDate)

    if (attendanceError) throw attendanceError

    // Get today's makeup bookings
    const { data: makeupBookings, error: makeupError } = await client
      .from('makeup_bookings')
      .select(`
        *,
        student:students(
          id,
          first_name,
          last_name,
          photo_url,
          allergies,
          medical_conditions,
          emergency_contact_name,
          emergency_contact_phone
        ),
        makeup_class:class_instances!makeup_bookings_makeup_class_instance_id_fkey(
          id,
          name
        )
      `)
      .eq('makeup_date', todayDate)
      .eq('status', 'booked')

    if (makeupError) throw makeupError

    // Format roster data
    const roster = scheduleClasses?.flatMap((sc: any) => {
      const classInstance = sc.class_instance
      const enrolledStudents = classInstance.enrollments.map((enrollment: any) => {
        const student = enrollment.student
        const attendance = attendanceRecords?.find(
          (a: any) => a.student_id === student.id && a.class_instance_id === classInstance.id
        )

        return {
          schedule_class_id: sc.id,
          day_of_week: sc.day_of_week,
          start_time: sc.start_time,
          end_time: sc.end_time,
          class_instance_id: classInstance.id,
          class_name: classInstance.name,
          dance_style: classInstance.dance_style?.name,
          dance_style_color: classInstance.dance_style?.color,
          teacher_name: classInstance.teacher
            ? `${classInstance.teacher.first_name} ${classInstance.teacher.last_name}`
            : null,
          student_id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          photo_url: student.photo_url,
          allergies: student.allergies,
          medical_conditions: student.medical_conditions,
          emergency_contact_name: student.emergency_contact_name,
          emergency_contact_phone: student.emergency_contact_phone,
          enrollment_status: enrollment.status,
          attendance_status: attendance?.status,
          attendance_id: attendance?.id,
          check_in_time: attendance?.check_in_time,
          check_out_time: attendance?.check_out_time,
          is_makeup: false,
        }
      })

      // Add makeup students to this class
      const makeupStudents = makeupBookings
        ?.filter((booking: any) => booking.makeup_class_instance_id === classInstance.id)
        .map((booking: any) => {
          const student = booking.student
          const attendance = attendanceRecords?.find(
            (a: any) => a.student_id === student.id && a.class_instance_id === classInstance.id
          )

          return {
            schedule_class_id: sc.id,
            day_of_week: sc.day_of_week,
            start_time: sc.start_time,
            end_time: sc.end_time,
            class_instance_id: classInstance.id,
            class_name: classInstance.name,
            dance_style: classInstance.dance_style?.name,
            dance_style_color: classInstance.dance_style?.color,
            teacher_name: classInstance.teacher
              ? `${classInstance.teacher.first_name} ${classInstance.teacher.last_name}`
              : null,
            student_id: student.id,
            first_name: student.first_name,
            last_name: student.last_name,
            photo_url: student.photo_url,
            allergies: student.allergies,
            medical_conditions: student.medical_conditions,
            emergency_contact_name: student.emergency_contact_name,
            emergency_contact_phone: student.emergency_contact_phone,
            enrollment_status: 'makeup',
            attendance_status: attendance?.status,
            attendance_id: attendance?.id,
            check_in_time: attendance?.check_in_time,
            check_out_time: attendance?.check_out_time,
            is_makeup: true,
            makeup_booking_id: booking.id,
          }
        }) || []

      return [...enrolledStudents, ...makeupStudents]
    }) || []

    // Sort by class start time, then by student name
    roster.sort((a: any, b: any) => {
      if (a.start_time !== b.start_time) {
        return a.start_time.localeCompare(b.start_time)
      }
      const nameA = `${a.last_name} ${a.first_name}`
      const nameB = `${b.last_name} ${b.first_name}`
      return nameA.localeCompare(nameB)
    })

    return {
      date: todayDate,
      day_of_week: dayOfWeek,
      roster,
      summary: {
        total_expected: roster.length,
        checked_in: roster.filter((r: any) => r.attendance_status === 'present' || r.attendance_status === 'tardy').length,
        not_checked_in: roster.filter((r: any) => !r.attendance_status).length,
        tardy: roster.filter((r: any) => r.attendance_status === 'tardy').length,
        left_early: roster.filter((r: any) => r.attendance_status === 'left_early').length,
      },
    }
  } catch (error: any) {
    console.error('Error fetching today\'s roster:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch today\'s roster',
    })
  }
})
