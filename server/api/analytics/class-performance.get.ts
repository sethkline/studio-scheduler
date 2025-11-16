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
    // CLASS PERFORMANCE - Using analytics_enrollment_stats view
    // ============================================================================

    const { data: classStats, error: classStatsError } = await client
      .from('analytics_enrollment_stats')
      .select('*')
      .order('active_enrollments', { ascending: false })

    if (classStatsError) throw classStatsError

    // ============================================================================
    // CALCULATE CLASS PERFORMANCE METRICS
    // ============================================================================

    const classPerformance = (classStats || []).map(cls => {
      const enrolled = cls.active_enrollments || 0
      const maxStudents = cls.max_students || 0
      const capacityUtilization = maxStudents > 0 ? (enrolled / maxStudents) * 100 : 0

      const revenue = (cls.total_tuition_collected_cents || 0) / 100
      const billed = (cls.total_tuition_billed_cents || 0) / 100

      // Estimate teacher cost (placeholder - would need actual teacher pay rates)
      // Assuming average $50/hour for 1-hour class, 12 weeks per term
      const estimatedTeacherCost = 50 * 12 // $50/hour * 12 weeks

      const profitability = revenue - estimatedTeacherCost

      return {
        classId: cls.class_name, // Using class name as ID
        className: cls.class_name || 'Unknown',
        danceStyle: cls.dance_style || 'Unknown',
        level: cls.class_level || 'Unknown',
        teacher: cls.teacher_name || 'Unassigned',
        schedule: cls.schedule_name ? {
          term: cls.schedule_name
        } : null,
        enrolled,
        maxStudents,
        available: cls.available_spots || 0,
        waitlistCount: cls.waitlist_count || 0,
        capacityUtilization: Math.round(capacityUtilization * 100) / 100,
        attendanceRate: cls.attendance_rate_percentage !== null ? Math.round((cls.attendance_rate_percentage || 0) * 100) / 100 : null,
        revenue,
        billed,
        collectionRate: billed > 0 ? Math.round((revenue / billed) * 100 * 100) / 100 : 100,
        estimatedCost: estimatedTeacherCost,
        profitability
      }
    })

    // ============================================================================
    // POPULAR TIME SLOTS
    // Note: Schedule time information not available in analytics view
    // This would require querying schedule_classes table
    // ============================================================================

    const popularTimeSlots: any[] = []

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
        attendanceRateSum: 0,
        attendanceRateCount: 0
      }

      stylePerformanceMap.set(style, {
        classCount: existing.classCount + 1,
        totalEnrolled: existing.totalEnrolled + cls.enrolled,
        totalCapacity: existing.totalCapacity + cls.maxStudents,
        totalRevenue: existing.totalRevenue + cls.revenue,
        attendanceRateSum: existing.attendanceRateSum + (cls.attendanceRate || 0),
        attendanceRateCount: existing.attendanceRateCount + (cls.attendanceRate !== null ? 1 : 0)
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
        attendanceRate: data.attendanceRateCount > 0 ? data.attendanceRateSum / data.attendanceRateCount : null
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
