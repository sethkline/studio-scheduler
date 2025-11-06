import { getSupabaseClient } from '../../utils/supabase'
import type { ReportAbsenceRequest } from '~/types/attendance'

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
    const body = await readBody<ReportAbsenceRequest>(event)
    const { student_id, class_instance_id, absence_date, absence_type, reason, reason_notes } = body

    if (!student_id || !class_instance_id || !absence_date) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields',
      })
    }

    // Verify user has permission (parent, staff, or admin)
    const { data: profile } = await client
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw createError({
        statusCode: 404,
        message: 'User profile not found',
      })
    }

    // If parent, verify they are guardian of this student
    if (profile.user_role === 'parent') {
      const { data: guardian } = await client
        .from('guardians')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (guardian) {
        const { data: relationship } = await client
          .from('student_guardian_relationships')
          .select('id')
          .eq('guardian_id', guardian.id)
          .eq('student_id', student_id)
          .maybeSingle()

        if (!relationship) {
          throw createError({
            statusCode: 403,
            message: 'You can only report absences for your own students',
          })
        }
      } else {
        throw createError({
          statusCode: 403,
          message: 'Guardian profile not found',
        })
      }
    } else if (!['admin', 'staff'].includes(profile.user_role)) {
      throw createError({
        statusCode: 403,
        message: 'Permission denied',
      })
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

    // Check if absence already reported
    const { data: existingAbsence } = await client
      .from('absences')
      .select('id')
      .eq('student_id', student_id)
      .eq('class_instance_id', class_instance_id)
      .eq('absence_date', absence_date)
      .maybeSingle()

    if (existingAbsence) {
      throw createError({
        statusCode: 409,
        message: 'Absence already reported for this date',
      })
    }

    // Create absence record
    const { data: absence, error: absenceError } = await client
      .from('absences')
      .insert({
        student_id,
        class_instance_id,
        absence_date,
        absence_type: absence_type || 'planned',
        reason,
        reason_notes,
        reported_by: user.id,
      })
      .select(`
        *,
        student:students(
          id,
          first_name,
          last_name
        ),
        class_instance:class_instances(
          id,
          name,
          dance_style:dance_styles(name, color)
        )
      `)
      .single()

    if (absenceError) throw absenceError

    // Mark as absent in attendance if date is today or past
    const today = new Date().toISOString().split('T')[0]
    if (absence_date <= today) {
      const date = new Date(absence_date)
      const dayOfWeek = date.getDay()

      const { data: scheduleClass } = await client
        .from('schedule_classes')
        .select('id')
        .eq('class_instance_id', class_instance_id)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle()

      // Check if attendance record exists
      const { data: existingAttendance } = await client
        .from('attendance')
        .select('id')
        .eq('student_id', student_id)
        .eq('class_instance_id', class_instance_id)
        .eq('attendance_date', absence_date)
        .maybeSingle()

      if (!existingAttendance) {
        // Create attendance record marked as absent
        await client
          .from('attendance')
          .insert({
            student_id,
            class_instance_id,
            schedule_class_id: scheduleClass?.id,
            attendance_date: absence_date,
            status: 'absent',
            marked_by: user.id,
          })
      }
    }

    return {
      success: true,
      absence,
    }
  } catch (error: any) {
    console.error('Error reporting absence:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to report absence',
    })
  }
})
