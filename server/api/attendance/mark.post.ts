import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'
import type { MarkAttendanceRequest } from '~/types/attendance'

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
    const body = await readBody<MarkAttendanceRequest>(event)
    const { student_id, class_instance_id, attendance_date, status, notes } = body

    if (!student_id || !class_instance_id || !attendance_date || !status) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields',
      })
    }

    // Verify user has permission (teacher, staff, or admin)
    const { data: profile } = await client
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'staff', 'teacher'].includes(profile.user_role)) {
      throw createError({
        statusCode: 403,
        message: 'Permission denied',
      })
    }

    // If teacher, verify they teach this class
    if (profile.user_role === 'teacher') {
      const { data: classInstance } = await client
        .from('class_instances')
        .select('teacher_id')
        .eq('id', class_instance_id)
        .single()

      if (!classInstance || classInstance.teacher_id !== user.id) {
        throw createError({
          statusCode: 403,
          message: 'You can only mark attendance for your own classes',
        })
      }
    }

    // Verify student is enrolled in this class
    const { data: enrollment } = await client
      .from('enrollments')
      .select('id, status')
      .eq('student_id', student_id)
      .eq('class_instance_id', class_instance_id)
      .eq('status', 'active')
      .maybeSingle()

    if (!enrollment) {
      throw createError({
        statusCode: 404,
        message: 'Student is not enrolled in this class',
      })
    }

    // Get schedule class ID for this date
    const date = new Date(attendance_date)
    const dayOfWeek = date.getDay()

    const { data: scheduleClass } = await client
      .from('schedule_classes')
      .select('id')
      .eq('class_instance_id', class_instance_id)
      .eq('day_of_week', dayOfWeek)
      .maybeSingle()

    // Check if attendance already exists
    const { data: existingAttendance } = await client
      .from('attendance')
      .select('id')
      .eq('student_id', student_id)
      .eq('class_instance_id', class_instance_id)
      .eq('attendance_date', attendance_date)
      .maybeSingle()

    let attendance
    if (existingAttendance) {
      // Update existing attendance
      const { data: updated, error: updateError } = await client
        .from('attendance')
        .update({
          status,
          notes,
          marked_by: user.id,
          marked_at: new Date().toISOString(),
        })
        .eq('id', existingAttendance.id)
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
      attendance = updated
    } else {
      // Create new attendance record
      const { data: created, error: createError } = await client
        .from('attendance')
        .insert({
          student_id,
          class_instance_id,
          schedule_class_id: scheduleClass?.id,
          attendance_date,
          status,
          notes,
          marked_by: user.id,
          marked_at: new Date().toISOString(),
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

      if (createError) throw createError
      attendance = created
    }

    // If marking as absent and no absence record exists, create one
    if (status === 'absent') {
      const { data: existingAbsence } = await client
        .from('absences')
        .select('id')
        .eq('student_id', student_id)
        .eq('class_instance_id', class_instance_id)
        .eq('absence_date', attendance_date)
        .maybeSingle()

      if (!existingAbsence) {
        await client
          .from('absences')
          .insert({
            student_id,
            class_instance_id,
            absence_date: attendance_date,
            absence_type: 'unplanned',
            reported_by: user.id,
          })
      }
    }

    return {
      success: true,
      attendance,
    }
  } catch (error: any) {
    console.error('Error marking attendance:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to mark attendance',
    })
  }
})
