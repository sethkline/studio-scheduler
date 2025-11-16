// server/api/analytics/retention.get.ts
import { getSupabaseClient } from '../../utils/supabase'
import { format, subMonths, differenceInMonths, differenceInDays } from 'date-fns'
import { requireAnalyticsAccess, logAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // SECURITY: Require admin or staff role for retention analytics
    const profile = await requireAnalyticsAccess(event)

    // Log access for auditing
    logAccess(event, 'analytics/retention', 'read', true)

    const client = getSupabaseClient()
    const query = getQuery(event)

    // Parse query parameters
    const startDate = query.startDate as string || format(subMonths(new Date(), 12), 'yyyy-MM-dd')
    const endDate = query.endDate as string || format(new Date(), 'yyyy-MM-dd')

    // ============================================================================
    // RETENTION RATE (% students who re-enroll each term)
    // ============================================================================

    // Get all schedules/terms in date range
    const { data: schedules, error: schedulesError } = await client
      .from('schedules')
      .select('id, name, start_date, end_date')
      .order('start_date', { ascending: false })
      .limit(10)

    if (schedulesError) throw schedulesError

    // Calculate retention between consecutive terms
    const retentionRates = []

    for (let i = 0; i < schedules.length - 1; i++) {
      const currentTerm = schedules[i]
      const previousTerm = schedules[i + 1]

      // Get students enrolled in previous term
      const { data: previousStudents, error: prevError } = await client
        .from('enrollments')
        .select(`
          student_id,
          class_instance:class_instance_id (
            schedule_classes (
              schedule:schedule_id (id, name)
            )
          )
        `)
        .eq('status', 'active')

      if (prevError) throw prevError

      const prevTermStudents = new Set(
        previousStudents
          ?.filter(e =>
            e.class_instance?.schedule_classes?.some(sc => sc.schedule?.id === previousTerm.id)
          )
          .map(e => e.student_id) || []
      )

      // Get students enrolled in current term
      const { data: currentStudents, error: currError } = await client
        .from('enrollments')
        .select(`
          student_id,
          class_instance:class_instance_id (
            schedule_classes (
              schedule:schedule_id (id, name)
            )
          )
        `)
        .eq('status', 'active')

      if (currError) throw currError

      const currTermStudents = new Set(
        currentStudents
          ?.filter(e =>
            e.class_instance?.schedule_classes?.some(sc => sc.schedule?.id === currentTerm.id)
          )
          .map(e => e.student_id) || []
      )

      // Calculate retention
      const retained = Array.from(prevTermStudents).filter(id => currTermStudents.has(id)).length
      const retentionRate = prevTermStudents.size > 0 ? (retained / prevTermStudents.size) * 100 : 0

      retentionRates.push({
        previousTerm: previousTerm.name,
        currentTerm: currentTerm.name,
        previousTermStudents: prevTermStudents.size,
        retainedStudents: retained,
        retentionRate: Math.round(retentionRate * 100) / 100
      })
    }

    // Overall average retention rate
    const avgRetentionRate =
      retentionRates.length > 0
        ? retentionRates.reduce((sum, r) => sum + r.retentionRate, 0) / retentionRates.length
        : 0

    // ============================================================================
    // AVERAGE STUDENT LIFETIME (terms/years)
    // ============================================================================

    const { data: studentLifetimes, error: lifetimeError } = await client
      .from('students')
      .select(`
        id,
        created_at,
        status,
        enrollments (
          enrollment_date,
          status
        )
      `)

    if (lifetimeError) throw lifetimeError

    const lifetimes = studentLifetimes?.map(student => {
      const enrollments = student.enrollments || []
      if (enrollments.length === 0) return 0

      const firstEnrollment = new Date(Math.min(...enrollments.map(e => new Date(e.enrollment_date).getTime())))
      const lastDate = student.status === 'active' ? new Date() : new Date(Math.max(...enrollments.map(e => new Date(e.enrollment_date).getTime())))

      return differenceInMonths(lastDate, firstEnrollment)
    }) || []

    const avgLifetimeMonths = lifetimes.length > 0 ? lifetimes.reduce((sum, l) => sum + l, 0) / lifetimes.length : 0
    const avgLifetimeYears = avgLifetimeMonths / 12

    // ============================================================================
    // CHURN RATE
    // ============================================================================

    // Get students who were active at start of period
    const { data: startActiveStudents, error: startActiveError } = await client
      .from('enrollments')
      .select('student_id', { count: 'exact', head: false })
      .eq('status', 'active')
      .lte('enrollment_date', startDate)

    if (startActiveError) throw startActiveError

    const studentsAtStart = new Set(startActiveStudents?.map(e => e.student_id))

    // Get students who churned during period
    const { data: churnedStudents, error: churnError } = await client
      .from('enrollments')
      .select('student_id')
      .in('status', ['withdrawn', 'cancelled', 'inactive'])
      .gte('updated_at', startDate)
      .lte('updated_at', endDate)

    if (churnError) throw churnError

    const churnedCount = new Set(churnedStudents?.map(e => e.student_id)).size
    const churnRate = studentsAtStart.size > 0 ? (churnedCount / studentsAtStart.size) * 100 : 0

    // ============================================================================
    // COHORT ANALYSIS (track enrollment class over time)
    // ============================================================================

    // Get all active classes with their enrollment history
    const { data: cohortData, error: cohortError } = await client
      .from('class_instances')
      .select(`
        id,
        created_at,
        class_definition:class_definition_id (
          name,
          dance_style:dance_style_id (name)
        ),
        enrollments (
          id,
          student_id,
          enrollment_date,
          status,
          updated_at
        )
      `)
      .eq('status', 'active')
      .limit(50)

    if (cohortError) throw cohortError

    const cohorts = cohortData?.map(cls => {
      const enrollments = cls.enrollments || []
      const activeEnrollments = enrollments.filter(e => e.status === 'active')
      const totalEnrollments = enrollments.length

      // Calculate how long students have been enrolled
      const enrollmentDurations = activeEnrollments.map(e => {
        const enrollDate = new Date(e.enrollment_date)
        return differenceInDays(new Date(), enrollDate)
      })

      const avgDuration = enrollmentDurations.length > 0
        ? enrollmentDurations.reduce((sum, d) => sum + d, 0) / enrollmentDurations.length
        : 0

      return {
        classId: cls.id,
        className: cls.class_definition?.name || 'Unknown',
        danceStyle: cls.class_definition?.dance_style?.name || 'Unknown',
        totalEnrollments,
        activeEnrollments: activeEnrollments.length,
        retentionRate: totalEnrollments > 0 ? (activeEnrollments.length / totalEnrollments) * 100 : 0,
        avgEnrollmentDays: Math.round(avgDuration)
      }
    }).sort((a, b) => b.retentionRate - a.retentionRate)

    // ============================================================================
    // RETENTION BY TEACHER
    // ============================================================================

    const { data: teacherRetention, error: teacherRetentionError } = await client
      .from('class_instances')
      .select(`
        teacher:teacher_id (
          id,
          first_name,
          last_name
        ),
        enrollments (
          id,
          status
        )
      `)
      .eq('status', 'active')

    if (teacherRetentionError) throw teacherRetentionError

    const teacherRetentionMap = new Map()
    teacherRetention?.forEach(cls => {
      if (!cls.teacher) return

      const teacherId = cls.teacher.id
      const teacherName = `${cls.teacher.first_name} ${cls.teacher.last_name}`
      const enrollments = cls.enrollments || []
      const activeCount = enrollments.filter(e => e.status === 'active').length
      const totalCount = enrollments.length

      const existing = teacherRetentionMap.get(teacherId) || {
        name: teacherName,
        totalEnrollments: 0,
        activeEnrollments: 0
      }

      teacherRetentionMap.set(teacherId, {
        name: existing.name,
        totalEnrollments: existing.totalEnrollments + totalCount,
        activeEnrollments: existing.activeEnrollments + activeCount
      })
    })

    const retentionByTeacher = Array.from(teacherRetentionMap.values())
      .map(teacher => ({
        teacherName: teacher.name,
        totalEnrollments: teacher.totalEnrollments,
        activeEnrollments: teacher.activeEnrollments,
        retentionRate: teacher.totalEnrollments > 0
          ? (teacher.activeEnrollments / teacher.totalEnrollments) * 100
          : 0
      }))
      .sort((a, b) => b.retentionRate - a.retentionRate)

    // ============================================================================
    // RETENTION BY CLASS STYLE
    // ============================================================================

    const { data: styleRetention, error: styleRetentionError } = await client
      .from('enrollments')
      .select(`
        status,
        class_instance:class_instance_id (
          class_definition:class_definition_id (
            dance_style:dance_style_id (
              name
            )
          )
        )
      `)

    if (styleRetentionError) throw styleRetentionError

    const styleRetentionMap = new Map()
    styleRetention?.forEach(enrollment => {
      const styleName = enrollment.class_instance?.class_definition?.dance_style?.name
      if (!styleName) return

      const existing = styleRetentionMap.get(styleName) || { total: 0, active: 0 }
      styleRetentionMap.set(styleName, {
        total: existing.total + 1,
        active: existing.active + (enrollment.status === 'active' ? 1 : 0)
      })
    })

    const retentionByStyle = Array.from(styleRetentionMap.entries())
      .map(([style, data]) => ({
        danceStyle: style,
        totalEnrollments: data.total,
        activeEnrollments: data.active,
        retentionRate: data.total > 0 ? (data.active / data.total) * 100 : 0
      }))
      .sort((a, b) => b.retentionRate - a.retentionRate)

    // ============================================================================
    // AT-RISK STUDENTS (low attendance, late payments)
    // ============================================================================

    // Low attendance students (< 75% attendance in last 30 days)
    const { data: recentAttendance, error: attendanceError } = await client
      .from('attendance_records')
      .select(`
        student_id,
        status,
        student:student_id (
          first_name,
          last_name
        )
      `)
      .gte('attendance_date', format(subMonths(new Date(), 1), 'yyyy-MM-dd'))

    // Note: attendance_records table may not exist yet
    const attendanceByStudent = new Map()
    if (!attendanceError && recentAttendance) {
      recentAttendance.forEach(record => {
        const studentId = record.student_id
        const studentName = `${record.student?.first_name} ${record.student?.last_name}`

        const existing = attendanceByStudent.get(studentId) || {
          name: studentName,
          total: 0,
          present: 0
        }

        attendanceByStudent.set(studentId, {
          name: existing.name,
          total: existing.total + 1,
          present: existing.present + (record.status === 'present' ? 1 : 0)
        })
      })
    }

    const atRiskLowAttendance = Array.from(attendanceByStudent.values())
      .map(student => ({
        studentName: student.name,
        totalClasses: student.total,
        attended: student.present,
        attendanceRate: student.total > 0 ? (student.present / student.total) * 100 : 0
      }))
      .filter(s => s.attendanceRate < 75 && s.totalClasses >= 4)
      .sort((a, b) => a.attendanceRate - b.attendanceRate)

    // Students with overdue payments
    const { data: overdueInvoices, error: overdueError } = await client
      .from('invoices')
      .select(`
        student:student_id (
          id,
          first_name,
          last_name
        ),
        total_amount_in_cents,
        amount_paid_in_cents,
        due_date
      `)
      .eq('status', 'overdue')

    const atRiskLatePayments = overdueInvoices?.map(invoice => ({
      studentName: `${invoice.student?.first_name} ${invoice.student?.last_name}`,
      amountDue: (invoice.total_amount_in_cents - invoice.amount_paid_in_cents) / 100,
      daysOverdue: differenceInDays(new Date(), new Date(invoice.due_date))
    })) || []

    // ============================================================================
    // REASONS FOR WITHDRAWAL
    // ============================================================================

    // Note: This would require a withdrawal_reason field on enrollments
    // Placeholder for future implementation
    const withdrawalReasons = [
      { reason: 'Not tracked yet', count: 0 }
    ]

    // ============================================================================
    // RETURN RESPONSE
    // ============================================================================

    return {
      dateRange: {
        startDate,
        endDate
      },
      summary: {
        avgRetentionRate: Math.round(avgRetentionRate * 100) / 100,
        avgLifetimeMonths: Math.round(avgLifetimeMonths * 100) / 100,
        avgLifetimeYears: Math.round(avgLifetimeYears * 100) / 100,
        churnRate: Math.round(churnRate * 100) / 100,
        studentsAtStart: studentsAtStart.size,
        studentsChurned: churnedCount
      },
      retentionRates,
      cohortAnalysis: cohorts?.slice(0, 20) || [],
      retentionByTeacher,
      retentionByStyle,
      atRisk: {
        lowAttendance: atRiskLowAttendance.slice(0, 20),
        latePayments: atRiskLatePayments.slice(0, 20),
        totalAtRisk: atRiskLowAttendance.length + atRiskLatePayments.length
      },
      withdrawalReasons
    }
  } catch (error) {
    console.error('Retention analytics error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch retention analytics'
    })
  }
})
