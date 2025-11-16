// server/api/analytics/teacher-metrics.get.ts
import { getSupabaseClient } from '../../utils/supabase'
import { format, subMonths } from 'date-fns'
import { requireAnalyticsAccess, logAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // SECURITY: Require admin or staff role for teacher metrics analytics
    const profile = await requireAnalyticsAccess(event)

    // Log access for auditing
    logAccess(event, 'analytics/teacher-metrics', 'read', true)

    const client = getSupabaseClient()
    const query = getQuery(event)

    // Parse query parameters
    const startDate = query.startDate as string || format(subMonths(new Date(), 12), 'yyyy-MM-dd')
    const endDate = query.endDate as string || format(new Date(), 'yyyy-MM-dd')

    // ============================================================================
    // GET TEACHER METRICS - Using analytics_enrollment_stats view
    // ============================================================================

    const { data: classStats, error: classStatsError } = await client
      .from('analytics_enrollment_stats')
      .select('*')
      .not('teacher_name', 'is', null)

    if (classStatsError) throw classStatsError

    // Get teacher details for hourly rates
    const { data: teachers, error: teachersError } = await client
      .from('teachers')
      .select('id, first_name, last_name, email, phone, hourly_rate')

    if (teachersError) throw teachersError

    // Create a map of teacher names to details
    const teacherDetailsMap = new Map()
    teachers?.forEach(teacher => {
      const name = `${teacher.first_name} ${teacher.last_name}`
      teacherDetailsMap.set(name, teacher)
    })

    // ============================================================================
    // CALCULATE TEACHER METRICS - Aggregate from analytics view
    // ============================================================================

    const teacherStatsMap = new Map()

    ;(classStats || []).forEach(cls => {
      const teacherName = cls.teacher_name
      if (!teacherName) return

      const existing = teacherStatsMap.get(teacherName) || {
        classesTaught: 0,
        totalEnrolled: 0,
        totalCapacity: 0,
        totalRevenue: 0,
        totalBilled: 0,
        attendanceRateSum: 0,
        attendanceRateCount: 0
      }

      teacherStatsMap.set(teacherName, {
        classesTaught: existing.classesTaught + 1,
        totalEnrolled: existing.totalEnrolled + (cls.active_enrollments || 0),
        totalCapacity: existing.totalCapacity + (cls.max_students || 0),
        totalRevenue: existing.totalRevenue + (cls.total_tuition_collected_cents || 0),
        totalBilled: existing.totalBilled + (cls.total_tuition_billed_cents || 0),
        attendanceRateSum: existing.attendanceRateSum + (cls.attendance_rate_percentage || 0),
        attendanceRateCount: existing.attendanceRateCount + (cls.attendance_rate_percentage !== null ? 1 : 0)
      })
    })

    const teacherMetrics = Array.from(teacherStatsMap.entries()).map(([teacherName, stats]) => {
      const teacherDetails = teacherDetailsMap.get(teacherName)
      const hourlyRate = teacherDetails?.hourly_rate || 50 // Default $50/hr

      // Estimate teaching hours (assuming 1-hour classes)
      const hoursPerWeek = stats.classesTaught * 1 // 1 hour per class
      const totalTeachingHours = hoursPerWeek * 12 // 12 weeks per term

      // Calculate metrics
      const avgClassSize = stats.classesTaught > 0 ? stats.totalEnrolled / stats.classesTaught : 0
      const utilization = (hoursPerWeek / 40) * 100 // % of 40-hour work week
      const attendanceRate = stats.attendanceRateCount > 0
        ? stats.attendanceRateSum / stats.attendanceRateCount
        : null
      const retentionRate = stats.totalCapacity > 0
        ? (stats.totalEnrolled / stats.totalCapacity) * 100
        : null

      // Revenue and payroll
      const revenueGenerated = stats.totalRevenue / 100
      const estimatedPayroll = hoursPerWeek * hourlyRate * 12 // 12 weeks per term
      const netContribution = revenueGenerated - estimatedPayroll

      // Collection rate
      const collectionRate = stats.totalBilled > 0
        ? (stats.totalRevenue / stats.totalBilled) * 100
        : 100

      return {
        teacherId: teacherDetails?.id || null,
        teacherName,
        email: teacherDetails?.email || null,
        phone: teacherDetails?.phone || null,
        hourlyRate,
        classesTaught: stats.classesTaught,
        timeSlots: stats.classesTaught, // Approximation
        totalTeachingMinutes: totalTeachingHours * 60,
        totalTeachingHours: Math.round(totalTeachingHours * 100) / 100,
        hoursPerWeek: Math.round(hoursPerWeek * 100) / 100,
        utilization: Math.round(utilization * 100) / 100,
        studentsTaught: stats.totalEnrolled, // Approximation (could be lower if students are in multiple classes)
        totalEnrolled: stats.totalEnrolled,
        avgClassSize: Math.round(avgClassSize * 100) / 100,
        revenueGenerated: Math.round(revenueGenerated * 100) / 100,
        billed: Math.round((stats.totalBilled / 100) * 100) / 100,
        collectionRate: Math.round(collectionRate * 100) / 100,
        estimatedPayroll: Math.round(estimatedPayroll * 100) / 100,
        netContribution: Math.round(netContribution * 100) / 100,
        attendanceRate: attendanceRate !== null ? Math.round(attendanceRate * 100) / 100 : null,
        retentionRate: retentionRate !== null ? Math.round(retentionRate * 100) / 100 : null
      }
    })

    // ============================================================================
    // WORKLOAD DISTRIBUTION ANALYSIS
    // ============================================================================

    const totalTeachingHours = teacherMetrics.reduce((sum, t) => sum + t.totalTeachingHours, 0)
    const avgTeachingHours = teacherMetrics.length > 0 ? totalTeachingHours / teacherMetrics.length : 0

    const workloadDistribution = teacherMetrics.map(teacher => ({
      teacherName: teacher.teacherName,
      hoursPerWeek: teacher.hoursPerWeek,
      percentOfTotal: totalTeachingHours > 0 ? (teacher.totalTeachingHours / totalTeachingHours) * 100 : 0,
      deviationFromAvg: teacher.hoursPerWeek - (avgTeachingHours / teacherMetrics.length)
    })).sort((a, b) => b.hoursPerWeek - a.hoursPerWeek)

    // ============================================================================
    // IDENTIFY OVERWORKED OR UNDERUTILIZED TEACHERS
    // ============================================================================

    const overworkedThreshold = 20 // hours per week
    const underutilizedThreshold = 5 // hours per week

    const overworkedTeachers = teacherMetrics
      .filter(t => t.hoursPerWeek > overworkedThreshold)
      .map(t => ({
        teacherName: t.teacherName,
        hoursPerWeek: t.hoursPerWeek,
        classesTaught: t.classesTaught,
        utilization: t.utilization
      }))
      .sort((a, b) => b.hoursPerWeek - a.hoursPerWeek)

    const underutilizedTeachers = teacherMetrics
      .filter(t => t.hoursPerWeek < underutilizedThreshold && t.hoursPerWeek > 0)
      .map(t => ({
        teacherName: t.teacherName,
        hoursPerWeek: t.hoursPerWeek,
        classesTaught: t.classesTaught,
        utilization: t.utilization
      }))
      .sort((a, b) => a.hoursPerWeek - b.hoursPerWeek)

    // ============================================================================
    // TOP PERFORMERS BY REVENUE
    // ============================================================================

    const topRevenueTeachers = teacherMetrics
      .filter(t => t.revenueGenerated > 0)
      .sort((a, b) => b.revenueGenerated - a.revenueGenerated)
      .slice(0, 10)
      .map(t => ({
        teacherName: t.teacherName,
        revenueGenerated: t.revenueGenerated,
        classesTaught: t.classesTaught,
        studentsTaught: t.studentsTaught,
        avgClassSize: t.avgClassSize
      }))

    // ============================================================================
    // TOP PERFORMERS BY RETENTION
    // ============================================================================

    const topRetentionTeachers = teacherMetrics
      .filter(t => t.retentionRate !== null && t.classesTaught > 0)
      .sort((a, b) => (b.retentionRate || 0) - (a.retentionRate || 0))
      .slice(0, 10)
      .map(t => ({
        teacherName: t.teacherName,
        retentionRate: t.retentionRate,
        studentsTaught: t.studentsTaught,
        classesTaught: t.classesTaught
      }))

    // ============================================================================
    // TOP PERFORMERS BY ATTENDANCE
    // ============================================================================

    const topAttendanceTeachers = teacherMetrics
      .filter(t => t.attendanceRate !== null && t.classesTaught > 0)
      .sort((a, b) => (b.attendanceRate || 0) - (a.attendanceRate || 0))
      .slice(0, 10)
      .map(t => ({
        teacherName: t.teacherName,
        attendanceRate: t.attendanceRate,
        classesTaught: t.classesTaught,
        studentsTaught: t.studentsTaught
      }))

    // ============================================================================
    // PAYROLL ANALYSIS
    // ============================================================================

    const totalPayroll = teacherMetrics.reduce((sum, t) => sum + t.estimatedPayroll, 0)
    const totalRevenue = teacherMetrics.reduce((sum, t) => sum + t.revenueGenerated, 0)
    const netContribution = totalRevenue - totalPayroll
    const payrollRatio = totalRevenue > 0 ? (totalPayroll / totalRevenue) * 100 : 0

    const payrollByTeacher = teacherMetrics.map(t => ({
      teacherName: t.teacherName,
      estimatedPayroll: t.estimatedPayroll,
      revenueGenerated: t.revenueGenerated,
      netContribution: t.netContribution,
      roi: t.estimatedPayroll > 0 ? (t.netContribution / t.estimatedPayroll) * 100 : 0
    })).sort((a, b) => b.netContribution - a.netContribution)

    // ============================================================================
    // RECOMMENDATIONS
    // ============================================================================

    const recommendations = []

    // Balance workload
    if (overworkedTeachers.length > 0) {
      recommendations.push({
        type: 'workload',
        priority: 'high',
        message: `${overworkedTeachers.length} teacher(s) working over ${overworkedThreshold} hours/week. Consider redistributing classes.`,
        teachers: overworkedTeachers.slice(0, 3).map(t => t.teacherName)
      })
    }

    if (underutilizedTeachers.length > 0) {
      recommendations.push({
        type: 'utilization',
        priority: 'medium',
        message: `${underutilizedTeachers.length} teacher(s) working under ${underutilizedThreshold} hours/week. Consider adding more classes.`,
        teachers: underutilizedTeachers.slice(0, 3).map(t => t.teacherName)
      })
    }

    // Highlight top performers
    if (topRetentionTeachers.length > 0) {
      recommendations.push({
        type: 'recognition',
        priority: 'low',
        message: `Top retention rate: ${topRetentionTeachers[0].teacherName} (${topRetentionTeachers[0].retentionRate}%)`
      })
    }

    // Flag low performers
    const lowAttendanceTeachers = teacherMetrics.filter(t => t.attendanceRate !== null && t.attendanceRate < 70)
    if (lowAttendanceTeachers.length > 0) {
      recommendations.push({
        type: 'improvement',
        priority: 'medium',
        message: `${lowAttendanceTeachers.length} teacher(s) with attendance rates below 70%. Consider additional support or training.`
      })
    }

    // ============================================================================
    // SUMMARY STATISTICS
    // ============================================================================

    const summary = {
      totalTeachers: teacherMetrics.length,
      activeTeachers: teacherMetrics.filter(t => t.classesTaught > 0).length,
      totalClassesTaught: teacherMetrics.reduce((sum, t) => sum + t.classesTaught, 0),
      totalTeachingHours: Math.round(totalTeachingHours * 100) / 100,
      avgHoursPerTeacher: Math.round(avgTeachingHours * 100) / 100,
      totalStudentsTaught: teacherMetrics.reduce((sum, t) => sum + t.studentsTaught, 0),
      avgStudentsPerTeacher: teacherMetrics.length > 0
        ? Math.round((teacherMetrics.reduce((sum, t) => sum + t.studentsTaught, 0) / teacherMetrics.length) * 100) / 100
        : 0,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalPayroll: Math.round(totalPayroll * 100) / 100,
      netContribution: Math.round(netContribution * 100) / 100,
      payrollRatio: Math.round(payrollRatio * 100) / 100
    }

    // ============================================================================
    // RETURN RESPONSE
    // ============================================================================

    return {
      dateRange: {
        startDate,
        endDate
      },
      summary,
      teacherMetrics: teacherMetrics.sort((a, b) => b.totalTeachingHours - a.totalTeachingHours),
      workloadDistribution,
      overworkedTeachers,
      underutilizedTeachers,
      topPerformers: {
        byRevenue: topRevenueTeachers,
        byRetention: topRetentionTeachers,
        byAttendance: topAttendanceTeachers
      },
      payrollAnalysis: {
        summary: {
          totalPayroll: Math.round(totalPayroll * 100) / 100,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          netContribution: Math.round(netContribution * 100) / 100,
          payrollRatio: Math.round(payrollRatio * 100) / 100
        },
        byTeacher: payrollByTeacher
      },
      recommendations
    }
  } catch (error) {
    console.error('Teacher metrics error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch teacher metrics'
    })
  }
})
