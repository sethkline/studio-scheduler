import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'
import type { CheckOutRequest } from '~/types/attendance'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  try {
    const body = await readBody<CheckOutRequest>(event)
    const { attendance_id, check_out_time, notes } = body

    if (!attendance_id) {
      throw createError({
        statusCode: 400,
        message: 'Attendance ID is required',
      })
    }

    // Get existing attendance record
    const { data: attendance, error: attendanceError } = await client
      .from('attendance')
      .select('*')
      .eq('id', attendance_id)
      .single()

    if (attendanceError || !attendance) {
      throw createError({
        statusCode: 404,
        message: 'Attendance record not found',
      })
    }

    if (attendance.check_out_time) {
      throw createError({
        statusCode: 409,
        message: 'Student already checked out',
      })
    }

    const checkOutTimeValue = check_out_time || new Date().toISOString()

    // Check if student is leaving early
    let status = attendance.status
    const { data: scheduleClass } = await client
      .from('schedule_classes')
      .select('end_time')
      .eq('class_instance_id', attendance.class_instance_id)
      .eq('day_of_week', new Date().getDay())
      .single()

    if (scheduleClass && scheduleClass.end_time) {
      const classEndTime = new Date(`1970-01-01T${scheduleClass.end_time}`)
      const checkOutDate = new Date(checkOutTimeValue)
      const checkOutTimeOnly = new Date(`1970-01-01T${checkOutDate.toTimeString().split(' ')[0]}`)

      // If checking out more than 10 minutes before class ends
      const minutesEarly = (classEndTime.getTime() - checkOutTimeOnly.getTime()) / (1000 * 60)
      if (minutesEarly > 10) {
        status = 'left_early'
      }
    }

    // Update attendance record
    const { data: updatedAttendance, error: updateError } = await client
      .from('attendance')
      .update({
        check_out_time: checkOutTimeValue,
        status,
        notes: notes || attendance.notes,
      })
      .eq('id', attendance_id)
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

    if (updateError) throw updateError

    return {
      success: true,
      attendance: updatedAttendance,
    }
  } catch (error: any) {
    console.error('Error checking out student:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to check out student',
    })
  }
})
