// server/api/analytics/class-performance.get.ts
import { getSupabaseClient } from '../../utils/supabase'
import { format, subMonths } from 'date-fns'
import { requireAnalyticsAccess, logAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // SECURITY: Require admin or staff role for class performance analytics
    const profile = await requireAnalyticsAccess(event)

    // Log access for auditing
    logAccess(event, 'analytics/class-performance', 'read', true)

    const client = getSupabaseClient()
    const query = getQuery(event)

    // Parse query parameters
    const startDate = query.startDate as string || format(subMonths(new Date(), 12), 'yyyy-MM-dd')
    const endDate = query.endDate as string || format(new Date(), 'yyyy-MM-dd')

    // ============================================================================
    // ENROLLMENT VS CAPACITY PER CLASS
    // ============================================================================

    const { data: classes, error: classesError } = await client
      .from('class_instances')
      .select(`
        id,
        name,
        status,
        created_at,
        class_definition:class_definition_id (
          id,
          name,
          max_students,
          dance_style:dance_style_id (
            id,
            name
          ),
          class_level:class_level_id (
            id,
            name
          )
        ),
        teacher:teacher_id (
          id,
          first_name,
          last_name
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

    // Get enrollment counts for each class
    const classIds = classes?.map(c => c.id) || []

    const { data: enrollmentCounts, error: enrollmentError } = await client
      .from('enrollments')
      .select('class_instance_id, student_id')
      .in('class_instance_id', classIds)
      .eq('status', 'active')

    if (enrollmentError) throw enrollmentError

    // Count enrollments per class
    const enrollmentMap = new Map()
    enrollmentCounts?.forEach(enrollment => {
      const classId = enrollment.class_instance_id
      const students = enrollmentMap.get(classId) || new Set()
      students.add(enrollment.student_id)
      enrollmentMap.set(classId, students)
    })

    // Get attendance records for each class
    const { data: attendanceRecords, error: attendanceError } = await client
      .from('attendance_records')
      .select('class_instance_id, status')
      .in('class_instance_id', classIds)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)

    // Note: attendance_records may not exist yet, handle gracefully
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

    // Get revenue per class
    const { data: revenueData, error: revenueError } = await client
      .from('invoice_items')
      .select('class_instance_id, total_price_in_cents')
      .in('class_instance_id', classIds)
      .eq('item_type', 'tuition')

    // Note: invoice_items may not exist yet, handle gracefully
    const revenueMap = new Map()
    if (!revenueError && revenueData) {
      revenueData.forEach(item => {
        const classId = item.class_instance_id
        const existing = revenueMap.get(classId) || 0
        revenueMap.set(classId, existing + (item.total_price_in_cents || 0))
      })
    }

    // ============================================================================
    // CALCULATE CLASS PERFORMANCE METRICS
    // ============================================================================

    const classPerformance = classes?.map(cls => {
      const enrolled = enrollmentMap.get(cls.id)?.size || 0
      const maxStudents = cls.class_definition?.max_students || 0
      const capacityUtilization = maxStudents > 0 ? (enrolled / maxStudents) * 100 : 0

      const attendance = attendanceMap.get(cls.id) || { total: 0, present: 0 }
      const attendanceRate = attendance.total > 0 ? (attendance.present / attendance.total) * 100 : null

      const revenue = revenueMap.get(cls.id) || 0

      // Estimate teacher cost (placeholder - would need actual teacher pay rates)
      // Assuming average $50/hour, need actual implementation with teacher pay data
      const scheduleClass = cls.schedule_classes?.[0]
      const hoursPerWeek = scheduleClass
        ? (new Date(`2000-01-01 ${scheduleClass.end_time}`).getTime() -
            new Date(`2000-01-01 ${scheduleClass.start_time}`).getTime()) /
          (1000 * 60 * 60)
        : 0
      const estimatedTeacherCost = hoursPerWeek * 50 * 12 * 100 // 12 weeks per term, in cents

      const profitability = revenue - estimatedTeacherCost

      return {
        classId: cls.id,
        className: cls.class_definition?.name || cls.name || 'Unknown',
        danceStyle: cls.class_definition?.dance_style?.name || 'Unknown',
        level: cls.class_definition?.class_level?.name || 'Unknown',
        teacher: cls.teacher ? `${cls.teacher.first_name} ${cls.teacher.last_name}` : 'Unassigned',
        schedule: scheduleClass ? {
          dayOfWeek: scheduleClass.day_of_week,
          startTime: scheduleClass.start_time,
          endTime: scheduleClass.end_time,
          term: scheduleClass.schedule?.name || 'Unknown'
        } : null,
        enrolled,
        maxStudents,
        available: Math.max(0, maxStudents - enrolled),
        capacityUtilization: Math.round(capacityUtilization * 100) / 100,
        attendanceRate: attendanceRate !== null ? Math.round(attendanceRate * 100) / 100 : null,
        attendanceRecords: attendance.total,
        revenue: revenue / 100, // Convert to dollars
        estimatedCost: estimatedTeacherCost / 100,
        profitability: profitability / 100
      }
    }) || []

    // ============================================================================
    // POPULAR TIME SLOTS
    // ============================================================================

    const timeSlotMap = new Map()
    classes?.forEach(cls => {
      cls.schedule_classes?.forEach(schedule => {
        const timeSlot = `${schedule.day_of_week} ${schedule.start_time}`
        const enrolled = enrollmentMap.get(cls.id)?.size || 0
        const existing = timeSlotMap.get(timeSlot) || { classCount: 0, totalEnrollments: 0 }
        timeSlotMap.set(timeSlot, {
          classCount: existing.classCount + 1,
          totalEnrollments: existing.totalEnrollments + enrolled
        })
      })
    })

    const popularTimeSlots = Array.from(timeSlotMap.entries())
      .map(([timeSlot, data]) => ({
        timeSlot,
        classCount: data.classCount,
        totalEnrollments: data.totalEnrollments,
        avgEnrollment: data.classCount > 0 ? data.totalEnrollments / data.classCount : 0
      }))
      .sort((a, b) => b.avgEnrollment - a.avgEnrollment)
      .slice(0, 10)

    // ============================================================================
    // UNDERPERFORMING CLASSES (< 50% capacity or low attendance)
    // ============================================================================

    const underperformingClasses = classPerformance
      .filter(cls => cls.capacityUtilization < 50 || (cls.attendanceRate !== null && cls.attendanceRate < 70))
      .sort((a, b) => a.capacityUtilization - b.capacityUtilization)
      .slice(0, 20)

    // ============================================================================
    // TOP PERFORMING CLASSES (by profitability)
    // ============================================================================

    const topPerformingClasses = classPerformance
      .filter(cls => cls.profitability > 0)
      .sort((a, b) => b.profitability - a.profitability)
      .slice(0, 10)

    // ============================================================================
    // CLASS COMPARISON BY DANCE STYLE
    // ============================================================================

    const stylePerformanceMap = new Map()
    classPerformance.forEach(cls => {
      const style = cls.danceStyle
      const existing = stylePerformanceMap.get(style) || {
        classCount: 0,
        totalEnrolled: 0,
        totalCapacity: 0,
        totalRevenue: 0,
        totalAttendanceRecords: 0,
        totalPresent: 0
      }

      const attendanceData = attendanceMap.get(cls.classId) || { total: 0, present: 0 }

      stylePerformanceMap.set(style, {
        classCount: existing.classCount + 1,
        totalEnrolled: existing.totalEnrolled + cls.enrolled,
        totalCapacity: existing.totalCapacity + cls.maxStudents,
        totalRevenue: existing.totalRevenue + cls.revenue,
        totalAttendanceRecords: existing.totalAttendanceRecords + attendanceData.total,
        totalPresent: existing.totalPresent + attendanceData.present
      })
    })

    const performanceByStyle = Array.from(stylePerformanceMap.entries())
      .map(([style, data]) => ({
        danceStyle: style,
        classCount: data.classCount,
        totalEnrolled: data.totalEnrolled,
        avgEnrollment: data.classCount > 0 ? data.totalEnrolled / data.classCount : 0,
        capacityUtilization: data.totalCapacity > 0 ? (data.totalEnrolled / data.totalCapacity) * 100 : 0,
        totalRevenue: data.totalRevenue,
        avgRevenue: data.classCount > 0 ? data.totalRevenue / data.classCount : 0,
        attendanceRate: data.totalAttendanceRecords > 0 ? (data.totalPresent / data.totalAttendanceRecords) * 100 : null
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)

    // ============================================================================
    // RECOMMENDATIONS
    // ============================================================================

    const recommendations = []

    // Recommend classes to add
    const popularStyles = performanceByStyle
      .filter(s => s.capacityUtilization > 80)
      .slice(0, 3)

    popularStyles.forEach(style => {
      recommendations.push({
        type: 'add',
        priority: 'high',
        message: `Consider adding more ${style.danceStyle} classes (${Math.round(style.capacityUtilization)}% capacity)`
      })
    })

    // Recommend classes to remove or adjust
    underperformingClasses.slice(0, 5).forEach(cls => {
      if (cls.capacityUtilization < 30) {
        recommendations.push({
          type: 'remove',
          priority: 'medium',
          message: `Consider removing or rescheduling "${cls.className}" (${Math.round(cls.capacityUtilization)}% capacity)`,
          classId: cls.classId
        })
      } else if (cls.attendanceRate !== null && cls.attendanceRate < 60) {
        recommendations.push({
          type: 'adjust',
          priority: 'medium',
          message: `Investigate low attendance for "${cls.className}" (${Math.round(cls.attendanceRate)}% attendance rate)`,
          classId: cls.classId
        })
      }
    })

    // Recommend optimal time slots
    if (popularTimeSlots.length > 0) {
      recommendations.push({
        type: 'optimize',
        priority: 'low',
        message: `Most popular time slot: ${popularTimeSlots[0].timeSlot} (avg ${Math.round(popularTimeSlots[0].avgEnrollment)} students)`
      })
    }

    // ============================================================================
    // OPTIMAL PRICING ANALYSIS
    // ============================================================================

    // Calculate revenue per student
    const pricingAnalysis = classPerformance
      .filter(cls => cls.enrolled > 0 && cls.revenue > 0)
      .map(cls => ({
        className: cls.className,
        danceStyle: cls.danceStyle,
        enrolled: cls.enrolled,
        revenue: cls.revenue,
        revenuePerStudent: cls.revenue / cls.enrolled,
        capacityUtilization: cls.capacityUtilization
      }))
      .sort((a, b) => b.revenuePerStudent - a.revenuePerStudent)

    const avgRevenuePerStudent = pricingAnalysis.length > 0
      ? pricingAnalysis.reduce((sum, c) => sum + c.revenuePerStudent, 0) / pricingAnalysis.length
      : 0

    // ============================================================================
    // SUMMARY STATISTICS
    // ============================================================================

    const totalClasses = classPerformance.length
    const totalEnrolled = classPerformance.reduce((sum, c) => sum + c.enrolled, 0)
    const totalCapacity = classPerformance.reduce((sum, c) => sum + c.maxStudents, 0)
    const avgCapacityUtilization = totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0
    const totalRevenue = classPerformance.reduce((sum, c) => sum + c.revenue, 0)
    const totalProfitability = classPerformance.reduce((sum, c) => sum + c.profitability, 0)

    // ============================================================================
    // RETURN RESPONSE
    // ============================================================================

    return {
      dateRange: {
        startDate,
        endDate
      },
      summary: {
        totalClasses,
        totalEnrolled,
        totalCapacity,
        availableSpots: totalCapacity - totalEnrolled,
        avgCapacityUtilization: Math.round(avgCapacityUtilization * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalProfitability: Math.round(totalProfitability * 100) / 100,
        avgRevenuePerStudent: Math.round(avgRevenuePerStudent * 100) / 100
      },
      classPerformance: classPerformance.sort((a, b) => b.capacityUtilization - a.capacityUtilization),
      popularTimeSlots,
      underperformingClasses,
      topPerformingClasses,
      performanceByStyle,
      pricingAnalysis: pricingAnalysis.slice(0, 20),
      recommendations
    }
  } catch (error) {
    console.error('Class performance analytics error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch class performance analytics'
    })
  }
})
