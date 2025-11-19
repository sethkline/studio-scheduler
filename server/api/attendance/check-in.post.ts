import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'
import type { CheckInRequest } from '~/types/attendance'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - Please log in',
    })
  }

  try {
    const body = await readBody<CheckInRequest>(event)
    const { student_id, qr_code_data, class_instance_id, check_in_time, notes } = body

    // Step 1: Get student ID from QR code if provided
    let studentId = student_id
    if (qr_code_data && !studentId) {
      const { data: qrCode, error: qrError } = await client
        .from('student_qr_codes')
        .select('student_id, is_active')
        .eq('qr_code_data', qr_code_data)
        .single()

      if (qrError) {
        console.error('QR code lookup error:', qrError)
        throw createError({
          statusCode: 404,
          message: 'QR code not found. Please generate a new QR code for this student.',
        })
      }

      if (!qrCode.is_active) {
        throw createError({
          statusCode: 403,
          message: 'QR code is inactive. Please contact staff for assistance.',
        })
      }

      studentId = qrCode.student_id

      // Update last used time (non-blocking)
      client
        .from('student_qr_codes')
        .update({ last_used_at: new Date().toISOString() })
        .eq('qr_code_data', qr_code_data)
        .then(() => {})
    }

    if (!studentId) {
      throw createError({
        statusCode: 400,
        message: 'Student ID or QR code is required',
      })
    }

    // Step 2: Verify student exists and get details
    const { data: student, error: studentError } = await client
      .from('students')
      .select('id, first_name, last_name, photo_url, status')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      console.error('Student lookup error:', studentError)
      throw createError({
        statusCode: 404,
        message: `Student not found in system`,
      })
    }

    if (student.status !== 'active') {
      throw createError({
        statusCode: 403,
        message: `Student account is ${student.status}. Please contact staff.`,
      })
    }

    // Step 3: Find current class if not provided
    let classInstanceId = class_instance_id
    let scheduleClassId = null

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
            status,
            enrollments!inner(
              id,
              student_id,
              status
            )
          )
        `)
        .eq('day_of_week', dayOfWeek)
        .lte('start_time', currentTime)
        .gte('end_time', currentTime)
        .eq('class_instances.enrollments.student_id', studentId)
        .eq('class_instances.enrollments.status', 'active')
        .limit(1)
        .maybeSingle()

      if (classError) {
        console.error('Class lookup error:', classError)
      }

      if (!currentClass) {
        throw createError({
          statusCode: 404,
          message: `No active class found for ${student.first_name} ${student.last_name} at this time. Please select a class manually.`,
        })
      }

      classInstanceId = currentClass.class_instance_id
      scheduleClassId = currentClass.id
    }

    // Step 4: Get enrollment record (CRITICAL - uses enrollment_id now)
    const { data: enrollment, error: enrollmentError } = await client
      .from('enrollments')
      .select('id, status')
      .eq('student_id', studentId)
      .eq('class_instance_id', classInstanceId)
      .single()

    // Check if this is a makeup booking if no enrollment
    let isMakeup = false
    let makeupBooking = null
    let enrollmentId = enrollment?.id

    if (enrollmentError || !enrollment) {
      const today = new Date().toISOString().split('T')[0]
      const { data: booking, error: bookingError } = await client
        .from('makeup_bookings')
        .select(`
          id,
          original_enrollment_id,
          makeup_class_instance_id,
          status
        `)
        .eq('student_id', studentId)
        .eq('makeup_class_instance_id', classInstanceId)
        .eq('makeup_date', today)
        .eq('status', 'booked')
        .maybeSingle()

      if (bookingError || !booking) {
        throw createError({
          statusCode: 403,
          message: `${student.first_name} ${student.last_name} is not enrolled in this class and has no makeup booking for today.`,
        })
      }

      isMakeup = true
      makeupBooking = booking
      enrollmentId = booking.original_enrollment_id
    } else if (enrollment.status !== 'active') {
      throw createError({
        statusCode: 403,
        message: `Enrollment is ${enrollment.status}. Please contact staff.`,
      })
    }

    const checkInTimeValue = check_in_time || new Date().toISOString()
    const attendanceDate = new Date().toISOString().split('T')[0]

    // Step 5: Check if already checked in today
    const { data: existingAttendance, error: existingError } = await client
      .from('attendance')
      .select('id, status, check_in_time')
      .eq('enrollment_id', enrollmentId)
      .eq('attendance_date', attendanceDate)
      .maybeSingle()

    if (existingAttendance) {
      const checkInTime = new Date(existingAttendance.check_in_time).toLocaleTimeString()
      throw createError({
        statusCode: 409,
        message: `${student.first_name} ${student.last_name} already checked in at ${checkInTime}`,
      })
    }

    // Step 6: Determine if student is tardy
    const { data: scheduleClass } = await client
      .from('schedule_classes')
      .select('id, start_time, day_of_week')
      .eq('class_instance_id', classInstanceId)
      .eq('day_of_week', new Date().getDay())
      .maybeSingle()

    let status: 'present' | 'tardy' = 'present'
    if (scheduleClass && scheduleClass.start_time) {
      scheduleClassId = scheduleClassId || scheduleClass.id
      const classStartTime = new Date(`1970-01-01T${scheduleClass.start_time}`)
      const checkInDate = new Date(checkInTimeValue)
      const checkInTimeOnly = new Date(`1970-01-01T${checkInDate.toTimeString().split(' ')[0]}`)

      const minutesLate = (checkInTimeOnly.getTime() - classStartTime.getTime()) / (1000 * 60)
      if (minutesLate > 10) {
        status = 'tardy'
      }
    }

    // Step 7: Create attendance record (uses enrollment_id!)
    const { data: attendance, error: attendanceError } = await client
      .from('attendance')
      .insert({
        enrollment_id: enrollmentId,
        student_id: studentId,
        class_instance_id: classInstanceId,
        schedule_class_id: scheduleClassId,
        attendance_date: attendanceDate,
        check_in_time: checkInTimeValue,
        status,
        is_makeup: isMakeup,
        marked_by: user.id,
        notes,
      })
      .select(`
        *,
        student:students(
          id,
          first_name,
          last_name,
          photo_url
        ),
        class_instance:class_instances(
          id,
          name,
          dance_style:dance_styles(name, color)
        )
      `)
      .single()

    if (attendanceError) {
      console.error('Attendance creation error:', attendanceError)
      throw createError({
        statusCode: 500,
        message: 'Failed to create attendance record. Please try again.',
      })
    }

    // Step 8: Update makeup booking if this is a makeup class
    if (isMakeup && makeupBooking) {
      const { error: updateError } = await client
        .from('makeup_bookings')
        .update({
          status: 'attended',
          attendance_id: attendance.id,
        })
        .eq('id', makeupBooking.id)

      if (!updateError) {
        // Update makeup credit usage
        await client.rpc('increment_makeup_credit_usage', {
          booking_id: makeupBooking.id
        })
      }
    }

    return {
      success: true,
      attendance,
      student,
      is_makeup: isMakeup,
      status,
      message: status === 'tardy'
        ? `${student.first_name} ${student.last_name} checked in late`
        : `${student.first_name} ${student.last_name} checked in successfully`,
    }
  } catch (error: any) {
    console.error('Check-in error:', error)

    // Return user-friendly error messages
    if (error.statusCode) {
      throw error // Already a createError
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'An unexpected error occurred during check-in. Please try again or contact staff.',
    })
  }
})
