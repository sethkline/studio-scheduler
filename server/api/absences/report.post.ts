import { getSupabaseClient } from '../../utils/supabase'
import { sendAbsenceNotification } from '../../utils/notifications'
import type { ReportAbsenceRequest } from '~/types/attendance'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - Please log in',
    })
  }

  try {
    const body = await readBody<ReportAbsenceRequest>(event)
    const { student_id, class_instance_id, absence_date, absence_type, reason, reason_notes } = body

    if (!student_id || !class_instance_id || !absence_date) {
      throw createError({
        statusCode: 400,
        message: 'Student ID, class ID, and absence date are required',
      })
    }

    // Verify user has permission (parent, staff, or admin)
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError)
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

      if (!guardian) {
        throw createError({
          statusCode: 403,
          message: 'Guardian profile not found',
        })
      }

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
    } else if (!['admin', 'staff'].includes(profile.user_role)) {
      throw createError({
        statusCode: 403,
        message: 'Permission denied',
      })
    }

    // Get enrollment record (using enrollment_id)
    const { data: enrollment, error: enrollmentError } = await client
      .from('enrollments')
      .select(`
        id,
        status,
        student:students(
          id,
          first_name,
          last_name
        ),
        class_instance:class_instances(
          id,
          name
        )
      `)
      .eq('student_id', student_id)
      .eq('class_instance_id', class_instance_id)
      .eq('status', 'active')
      .single()

    if (enrollmentError || !enrollment) {
      console.error('Enrollment lookup error:', enrollmentError)
      throw createError({
        statusCode: 404,
        message: 'Student is not enrolled in this class',
      })
    }

    // Check if absence already reported
    const { data: existingAbsence } = await client
      .from('absences')
      .select('id')
      .eq('enrollment_id', enrollment.id)
      .eq('absence_date', absence_date)
      .maybeSingle()

    if (existingAbsence) {
      throw createError({
        statusCode: 409,
        message: 'Absence already reported for this date',
      })
    }

    // Create absence record with enrollment_id
    const { data: absence, error: absenceError } = await client
      .from('absences')
      .insert({
        enrollment_id: enrollment.id,
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
          name
        )
      `)
      .single()

    if (absenceError) {
      console.error('Absence creation error:', absenceError)
      throw absenceError
    }

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
        .eq('enrollment_id', enrollment.id)
        .eq('attendance_date', absence_date)
        .maybeSingle()

      if (!existingAttendance) {
        // Create attendance record marked as absent
        await client
          .from('attendance')
          .insert({
            enrollment_id: enrollment.id,
            student_id,
            class_instance_id,
            schedule_class_id: scheduleClass?.id,
            attendance_date: absence_date,
            status: 'absent',
            marked_by: user.id,
          })
      }
    }

    // Send notification to guardians if this was an unexpected absence
    if (absence_type === 'unplanned' || !absence_type) {
      // Get all guardians for this student
      const { data: guardians } = await client
        .from('student_guardian_relationships')
        .select(`
          guardian:guardians(
            user:profiles!guardians_user_id_fkey(
              email,
              first_name,
              last_name
            )
          )
        `)
        .eq('student_id', student_id)

      if (guardians && guardians.length > 0) {
        // Send notification to each guardian
        for (const guardianRel of guardians) {
          const guardian = guardianRel.guardian as any
          if (guardian?.user?.email) {
            await sendAbsenceNotification({
              studentName: `${enrollment.student.first_name} ${enrollment.student.last_name}`,
              className: enrollment.class_instance.name,
              absenceDate: absence_date,
              parentEmail: guardian.user.email,
              parentName: `${guardian.user.first_name || ''} ${guardian.user.last_name || ''}`.trim(),
            })
          }
        }

        // Mark notification as sent
        await client
          .from('absences')
          .update({
            notification_sent: true,
            notification_sent_at: new Date().toISOString(),
          })
          .eq('id', absence.id)
      }
    }

    return {
      success: true,
      absence,
      message: 'Absence reported successfully',
    }
  } catch (error: any) {
    console.error('Error reporting absence:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to report absence. Please try again.',
    })
  }
})
