// server/api/analytics/teacher-metrics.get.ts
import { getSupabaseClient } from '../../utils/supabase'
import { format, subMonths } from 'date-fns'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)

    // Parse query parameters
    const startDate = query.startDate as string || format(subMonths(new Date(), 12), 'yyyy-MM-dd')
    const endDate = query.endDate as string || format(new Date(), 'yyyy-MM-dd')

    // ============================================================================
    // GET ALL TEACHERS WITH THEIR CLASSES
    // ============================================================================

    const { data: teachers, error: teachersError } = await client
      .from('teachers')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        hourly_rate,
        created_at
      `)
      .order('last_name')

    if (teachersError) throw teachersError

    // Get all active classes
    const { data: classes, error: classesError } = await client
      .from('class_instances')
      .select(`
        id,
        teacher_id,
        status,
        class_definition:class_definition_id (
          id,
          name,
          duration,
          max_students,
          dance_style:dance_style_id (name)
        ),
        schedule_classes (
          id,
          day_of_week,
          start_time,
          end_time,
          schedule:schedule_id (
            name,
            start_date,
            end_date
          )
        )
      `)
      .eq('status', 'active')

    if (classesError) throw classesError

    // Get all enrollments
    const classIds = classes?.map(c => c.id) || []
    const { data: enrollments, error: enrollmentsError } = await client
      .from('enrollments')
      .select('class_instance_id, student_id, status')
      .in('class_instance_id', classIds)
      .eq('status', 'active')

    if (enrollmentsError) throw enrollmentsError

    // Count enrollments per class
    const enrollmentMap = new Map()
    enrollments?.forEach(enrollment => {
      const classId = enrollment.class_instance_id
      const students = enrollmentMap.get(classId) || new Set()
      students.add(enrollment.student_id)
      enrollmentMap.set(classId, students)
    })

    // Get revenue per class
    const { data: revenueData, error: revenueError } = await client
      .from('invoice_items')
      .select('class_instance_id, total_price_in_cents')
      .in('class_instance_id', classIds)
      .eq('item_type', 'tuition')

    const revenueMap = new Map()
    if (!revenueError && revenueData) {
      revenueData.forEach(item => {
        const classId = item.class_instance_id
        const existing = revenueMap.get(classId) || 0
        revenueMap.set(classId, existing + (item.total_price_in_cents || 0))
      })
    }

    // Get attendance records
    const { data: attendanceRecords, error: attendanceError } = await client
      .from('attendance_records')
      .select('class_instance_id, status')
      .in('class_instance_id', classIds)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)

    const attendanceMap = new Map()
    if (!attendanceError && attendanceRecords) {
      attendanceRecords.forEach(record => {
        const classId = record.class_instance_id
        const existing = attendanceMap.get(classId) || { total: 0, present: 0 }
        attendanceMap.set(classId, {
          total: existing.total + 1,
          present: existing.present + (record.status === 'present' ? 1 : 0)
        })
      })
    }

    // ============================================================================
    // CALCULATE TEACHER METRICS
    // ============================================================================

    const teacherMetrics = teachers?.map(teacher => {
      // Get classes taught by this teacher
      const teacherClasses = classes?.filter(c => c.teacher_id === teacher.id) || []

      // Calculate total teaching hours
      let totalMinutes = 0
      const timeSlots = new Set()

      teacherClasses.forEach(cls => {
        cls.schedule_classes?.forEach(schedule => {
          const startTime = new Date(`2000-01-01 ${schedule.start_time}`)
          const endTime = new Date(`2000-01-01 ${schedule.end_time}`)
          const minutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60)
          totalMinutes += minutes
          timeSlots.add(`${schedule.day_of_week} ${schedule.start_time}`)
        })
      })

      // Calculate students taught
      const studentSet = new Set()
      teacherClasses.forEach(cls => {
        const students = enrollmentMap.get(cls.id)
        if (students) {
          students.forEach(studentId => studentSet.add(studentId))
        }
      })

      // Calculate total revenue generated
      let totalRevenue = 0
      teacherClasses.forEach(cls => {
        totalRevenue += revenueMap.get(cls.id) || 0
      })

      // Calculate average class size
      let totalEnrolled = 0
      let totalCapacity = 0
      teacherClasses.forEach(cls => {
        totalEnrolled += enrollmentMap.get(cls.id)?.size || 0
        totalCapacity += cls.class_definition?.max_students || 0
      })
      const avgClassSize = teacherClasses.length > 0 ? totalEnrolled / teacherClasses.length : 0

      // Calculate utilization (% of available hours)
      // Assuming max 40 hours per week, 52 weeks per year
      const hoursPerWeek = totalMinutes / 60
      const maxHoursPerWeek = 40
      const utilization = (hoursPerWeek / maxHoursPerWeek) * 100

      // Calculate attendance rate for teacher's classes
      let teacherAttendanceTotal = 0
      let teacherAttendancePresent = 0
      teacherClasses.forEach(cls => {
        const attendance = attendanceMap.get(cls.id)
        if (attendance) {
          teacherAttendanceTotal += attendance.total
          teacherAttendancePresent += attendance.present
        }
      })
      const attendanceRate = teacherAttendanceTotal > 0
        ? (teacherAttendancePresent / teacherAttendanceTotal) * 100
        : null

      // Calculate student retention for this teacher
      // (using current active enrollments as a proxy)
      const retentionRate = totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : null

      // Calculate estimated payroll cost
      const hourlyRate = teacher.hourly_rate || 50 // Default to $50/hr if not set
      const weeksPerTerm = 12 // Typical term length
      const estimatedPayroll = (hoursPerWeek * hourlyRate * weeksPerTerm)

      return {
        teacherId: teacher.id,
        teacherName: `${teacher.first_name} ${teacher.last_name}`,
        email: teacher.email,
        phone: teacher.phone,
        hourlyRate,
        classesTaught: teacherClasses.length,
        timeSlots: timeSlots.size,
        totalTeachingMinutes: totalMinutes,
        totalTeachingHours: Math.round(totalMinutes / 60 * 100) / 100,
        hoursPerWeek: Math.round(hoursPerWeek * 100) / 100,
        utilization: Math.round(utilization * 100) / 100,
        studentsTaught: studentSet.size,
        totalEnrolled,
        avgClassSize: Math.round(avgClassSize * 100) / 100,
        revenueGenerated: totalRevenue / 100,
        estimatedPayroll: Math.round(estimatedPayroll * 100) / 100,
        netContribution: (totalRevenue / 100) - estimatedPayroll,
        attendanceRate: attendanceRate !== null ? Math.round(attendanceRate * 100) / 100 : null,
        retentionRate: retentionRate !== null ? Math.round(retentionRate * 100) / 100 : null
      }
    }) || []

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
