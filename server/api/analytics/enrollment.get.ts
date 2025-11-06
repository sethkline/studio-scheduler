// server/api/analytics/enrollment.get.ts
import { getSupabaseClient } from '../../utils/supabase'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)

    // Parse query parameters
    const startDate = query.startDate as string || format(subMonths(new Date(), 12), 'yyyy-MM-dd')
    const endDate = query.endDate as string || format(new Date(), 'yyyy-MM-dd')

    // ============================================================================
    // TOTAL ENROLLED STUDENTS OVER TIME
    // ============================================================================

    const { data: enrollments, error: enrollmentsError } = await client
      .from('enrollments')
      .select(`
        id,
        student_id,
        enrollment_date,
        status,
        class_instance:class_instance_id (
          id,
          class_definition:class_definition_id (
            id,
            name,
            dance_style:dance_style_id (
              id,
              name
            ),
            class_level:class_level_id (
              id,
              name
            )
          )
        )
      `)
      .gte('enrollment_date', startDate)
      .lte('enrollment_date', endDate)
      .order('enrollment_date')

    if (enrollmentsError) throw enrollmentsError

    // ============================================================================
    // NEW ENROLLMENTS PER MONTH
    // ============================================================================

    const monthlyEnrollments = new Map()
    const uniqueStudentsByMonth = new Map()

    enrollments?.forEach(enrollment => {
      const month = format(new Date(enrollment.enrollment_date), 'yyyy-MM')

      // Count enrollments
      monthlyEnrollments.set(month, (monthlyEnrollments.get(month) || 0) + 1)

      // Track unique students
      const studentsSet = uniqueStudentsByMonth.get(month) || new Set()
      studentsSet.add(enrollment.student_id)
      uniqueStudentsByMonth.set(month, studentsSet)
    })

    const enrollmentTrends = Array.from(monthlyEnrollments.entries())
      .map(([month, count]) => ({
        month,
        newEnrollments: count,
        uniqueStudents: uniqueStudentsByMonth.get(month)?.size || 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // ============================================================================
    // WITHDRAWALS PER MONTH
    // ============================================================================

    const { data: withdrawals, error: withdrawalsError } = await client
      .from('enrollments')
      .select('id, enrollment_date, updated_at')
      .in('status', ['withdrawn', 'cancelled', 'inactive'])
      .gte('updated_at', startDate)
      .lte('updated_at', endDate)

    if (withdrawalsError) throw withdrawalsError

    const monthlyWithdrawals = new Map()
    withdrawals?.forEach(withdrawal => {
      const month = format(new Date(withdrawal.updated_at), 'yyyy-MM')
      monthlyWithdrawals.set(month, (monthlyWithdrawals.get(month) || 0) + 1)
    })

    // ============================================================================
    // NET GROWTH
    // ============================================================================

    const netGrowthTrends = enrollmentTrends.map(trend => ({
      month: trend.month,
      newEnrollments: trend.newEnrollments,
      withdrawals: monthlyWithdrawals.get(trend.month) || 0,
      netGrowth: trend.newEnrollments - (monthlyWithdrawals.get(trend.month) || 0)
    }))

    // ============================================================================
    // ENROLLMENT BY DANCE STYLE
    // ============================================================================

    const enrollmentsByStyle = new Map()
    enrollments?.forEach(enrollment => {
      if (!enrollment.class_instance?.class_definition?.dance_style) return

      const styleName = enrollment.class_instance.class_definition.dance_style.name
      const existing = enrollmentsByStyle.get(styleName) || 0
      enrollmentsByStyle.set(styleName, existing + 1)
    })

    const enrollmentsByDanceStyle = Array.from(enrollmentsByStyle.entries())
      .map(([style, count]) => ({ style, count }))
      .sort((a, b) => b.count - a.count)

    // ============================================================================
    // ENROLLMENT BY AGE GROUP
    // ============================================================================

    const { data: studentAges, error: studentAgesError } = await client
      .from('enrollments')
      .select(`
        student:student_id (
          date_of_birth
        )
      `)
      .in('id', enrollments?.map(e => e.id) || [])

    if (studentAgesError) throw studentAgesError

    const ageGroups = new Map([
      ['0-5', 0],
      ['6-8', 0],
      ['9-12', 0],
      ['13-17', 0],
      ['18+', 0]
    ])

    studentAges?.forEach(enrollment => {
      if (!enrollment.student?.date_of_birth) return

      const age = Math.floor(
        (new Date().getTime() - new Date(enrollment.student.date_of_birth).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000)
      )

      if (age <= 5) ageGroups.set('0-5', ageGroups.get('0-5')! + 1)
      else if (age <= 8) ageGroups.set('6-8', ageGroups.get('6-8')! + 1)
      else if (age <= 12) ageGroups.set('9-12', ageGroups.get('9-12')! + 1)
      else if (age <= 17) ageGroups.set('13-17', ageGroups.get('13-17')! + 1)
      else ageGroups.set('18+', ageGroups.get('18+')! + 1)
    })

    const enrollmentsByAgeGroup = Array.from(ageGroups.entries())
      .map(([ageGroup, count]) => ({ ageGroup, count }))

    // ============================================================================
    // CLASS CAPACITY UTILIZATION
    // ============================================================================

    const { data: capacityData, error: capacityError } = await client
      .from('class_instances')
      .select(`
        id,
        status,
        class_definition:class_definition_id (
          id,
          name,
          max_students,
          dance_style:dance_style_id (name)
        ),
        enrollments:enrollments(count)
      `)
      .eq('status', 'active')

    if (capacityError) throw capacityError

    const classCapacity = capacityData?.map(cls => {
      const maxStudents = cls.class_definition?.max_students || 0
      const enrolled = cls.enrollments?.[0]?.count || 0
      const utilization = maxStudents > 0 ? (enrolled / maxStudents) * 100 : 0

      return {
        classId: cls.id,
        className: cls.class_definition?.name || 'Unknown',
        danceStyle: cls.class_definition?.dance_style?.name || 'Unknown',
        maxStudents,
        enrolled,
        available: maxStudents - enrolled,
        utilizationPercent: Math.round(utilization * 100) / 100
      }
    }).sort((a, b) => b.utilizationPercent - a.utilizationPercent)

    // ============================================================================
    // WAITLIST SIZES (if waitlist table exists)
    // ============================================================================

    // Note: Waitlist feature not yet implemented
    // This is a placeholder for future implementation
    const waitlistSummary = {
      totalWaitlisted: 0,
      classesWithWaitlist: 0
    }

    // ============================================================================
    // SEASONAL TRENDS
    // ============================================================================

    // Group by month name to identify seasonal patterns
    const seasonalTrends = new Map()
    enrollments?.forEach(enrollment => {
      const monthName = format(new Date(enrollment.enrollment_date), 'MMMM')
      seasonalTrends.set(monthName, (seasonalTrends.get(monthName) || 0) + 1)
    })

    const seasonalPattern = Array.from(seasonalTrends.entries())
      .map(([month, count]) => ({ month, enrollments: count }))

    // ============================================================================
    // ENROLLMENT FORECAST (Simple Linear Regression)
    // ============================================================================

    // Calculate average monthly growth rate
    let forecastedGrowth = 0
    if (netGrowthTrends.length > 1) {
      const growthRates = netGrowthTrends.slice(1).map((trend, idx) =>
        trend.newEnrollments - netGrowthTrends[idx].newEnrollments
      )
      forecastedGrowth = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
    }

    // Calculate current active enrollments
    const { data: activeEnrollments, error: activeError } = await client
      .from('enrollments')
      .select('id', { count: 'exact' })
      .eq('status', 'active')

    if (activeError) throw activeError

    const currentActive = activeEnrollments?.length || 0
    const forecast = {
      currentActive,
      averageMonthlyGrowth: Math.round(forecastedGrowth * 100) / 100,
      projectedNextMonth: Math.round(currentActive + forecastedGrowth),
      projectedThreeMonths: Math.round(currentActive + (forecastedGrowth * 3)),
      projectedSixMonths: Math.round(currentActive + (forecastedGrowth * 6))
    }

    // ============================================================================
    // SUMMARY STATISTICS
    // ============================================================================

    const totalNewEnrollments = enrollments?.length || 0
    const totalWithdrawals = withdrawals?.length || 0
    const netGrowth = totalNewEnrollments - totalWithdrawals
    const uniqueStudents = new Set(enrollments?.map(e => e.student_id)).size

    // ============================================================================
    // RETURN RESPONSE
    // ============================================================================

    return {
      dateRange: {
        startDate,
        endDate
      },
      summary: {
        totalNewEnrollments,
        totalWithdrawals,
        netGrowth,
        uniqueStudents,
        currentActive
      },
      trends: {
        monthly: enrollmentTrends,
        netGrowth: netGrowthTrends,
        seasonal: seasonalPattern
      },
      enrollmentsByDanceStyle,
      enrollmentsByAgeGroup,
      classCapacity,
      waitlist: waitlistSummary,
      forecast
    }
  } catch (error) {
    console.error('Enrollment analytics error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch enrollment analytics'
    })
  }
})
