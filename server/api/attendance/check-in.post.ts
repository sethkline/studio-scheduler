import { getSupabaseClient } from '../../utils/supabase'
import type { CheckInRequest } from '~/types/attendance'

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
    const body = await readBody<CheckInRequest>(event)
    const { student_id, qr_code_data, class_instance_id, check_in_time, notes } = body

    // Get student ID from QR code if provided
    let studentId = student_id
    if (qr_code_data && !studentId) {
      const { data: qrCode, error: qrError } = await client
        .from('student_qr_codes')
        .select('student_id')
        .eq('qr_code_data', qr_code_data)
        .eq('is_active', true)
        .single()

      if (qrError || !qrCode) {
        throw createError({
          statusCode: 404,
          message: 'Invalid or inactive QR code',
        })
      }

      studentId = qrCode.student_id

      // Update last used time
      await client
        .from('student_qr_codes')
        .update({ last_used_at: new Date().toISOString() })
        .eq('qr_code_data', qr_code_data)
    }

    if (!studentId) {
      throw createError({
        statusCode: 400,
        message: 'Student ID or QR code required',
      })
    }

    // Get student details
    const { data: student, error: studentError } = await client
      .from('students')
      .select('id, first_name, last_name, photo_url, allergies, medical_conditions, emergency_contact_name, emergency_contact_phone')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      throw createError({
        statusCode: 404,
        message: 'Student not found',
      })
    }

    // If no class_instance_id provided, find the current class for this student
    let classInstanceId = class_instance_id
    if (!classInstanceId) {
      const now = new Date()
      const currentTime = now.toTimeString().split(' ')[0]
      const dayOfWeek = now.getDay()

      const { data: currentClass, error: classError } = await client
        .from('schedule_classes')
        .select(`
          id,
          class_instance_id,
          start_time,
          end_time,
          class_instances!inner(
            id,
            name,
            enrollments!inner(
              student_id
            )
          )
        `)
        .eq('day_of_week', dayOfWeek)
        .lte('start_time', currentTime)
        .gte('end_time', currentTime)
        .eq('class_instances.enrollments.student_id', studentId)
        .limit(1)
        .single()

      if (classError || !currentClass) {
        throw createError({
          statusCode: 404,
          message: 'No active class found for this student at this time',
        })
      }

      classInstanceId = currentClass.class_instance_id
    }

    // Verify student is enrolled in this class (or it's a makeup)
    const { data: enrollment, error: enrollmentError } = await client
      .from('enrollments')
      .select('id, status')
      .eq('student_id', studentId)
      .eq('class_instance_id', classInstanceId)
      .eq('status', 'active')
      .maybeSingle()

    // Check if this is a makeup booking
    let isMakeup = false
    let makeupBooking = null
    if (!enrollment) {
      const { data: booking, error: bookingError } = await client
        .from('makeup_bookings')
        .select('*')
        .eq('student_id', studentId)
        .eq('makeup_class_instance_id', classInstanceId)
        .eq('makeup_date', new Date().toISOString().split('T')[0])
        .eq('status', 'booked')
        .maybeSingle()

      if (booking) {
        isMakeup = true
        makeupBooking = booking
      } else {
        throw createError({
          statusCode: 403,
          message: 'Student is not enrolled in this class and has no makeup booking',
        })
      }
    }

    const checkInTimeValue = check_in_time || new Date().toISOString()
    const attendanceDate = new Date().toISOString().split('T')[0]

    // Check if already checked in today
    const { data: existingAttendance } = await client
      .from('attendance')
      .select('id, status')
      .eq('student_id', studentId)
      .eq('class_instance_id', classInstanceId)
      .eq('attendance_date', attendanceDate)
      .maybeSingle()

    if (existingAttendance) {
      throw createError({
        statusCode: 409,
        message: 'Student already checked in for this class today',
      })
    }

    // Determine if student is tardy
    const { data: scheduleClass } = await client
      .from('schedule_classes')
      .select('start_time, day_of_week')
      .eq('class_instance_id', classInstanceId)
      .eq('day_of_week', new Date().getDay())
      .single()

    let status: 'present' | 'tardy' = 'present'
    if (scheduleClass && scheduleClass.start_time) {
      const classStartTime = new Date(`1970-01-01T${scheduleClass.start_time}`)
      const checkInDate = new Date(checkInTimeValue)
      const checkInTimeOnly = new Date(`1970-01-01T${checkInDate.toTimeString().split(' ')[0]}`)

      // If more than 10 minutes late
      const minutesLate = (checkInTimeOnly.getTime() - classStartTime.getTime()) / (1000 * 60)
      if (minutesLate > 10) {
        status = 'tardy'
      }
    }

    // Create attendance record
    const { data: attendance, error: attendanceError } = await client
      .from('attendance')
      .insert({
        student_id: studentId,
        class_instance_id: classInstanceId,
        schedule_class_id: scheduleClass?.id || null,
        attendance_date: attendanceDate,
        check_in_time: checkInTimeValue,
        status,
        is_makeup: isMakeup,
        original_absence_id: makeupBooking?.absence_id || null,
        marked_by: user.id,
        notes,
      })
      .select(`
        *,
        student:students(
          id,
          first_name,
          last_name,
          photo_url,
          allergies,
          medical_conditions
        ),
        class_instance:class_instances(
          id,
          name,
          dance_style:dance_styles(name, color)
        )
      `)
      .single()

    if (attendanceError) throw attendanceError

    // If this is a makeup, update the booking status
    if (isMakeup && makeupBooking) {
      await client
        .from('makeup_bookings')
        .update({
          status: 'attended',
          attendance_id: attendance.id,
        })
        .eq('id', makeupBooking.id)

      // Update makeup credit usage
      await client
        .from('makeup_credits')
        .update({
          credits_used: client.rpc('increment', { x: 1 }),
        })
        .eq('id', makeupBooking.makeup_credit_id)
    }

    return {
      success: true,
      attendance,
      student,
      is_makeup: isMakeup,
    }
  } catch (error: any) {
    console.error('Error checking in student:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to check in student',
    })
  }
})
