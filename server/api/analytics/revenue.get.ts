// server/api/analytics/revenue.get.ts
import { getSupabaseClient } from '../../utils/supabase'
import { format, startOfMonth, endOfMonth, subMonths, subYears, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns'
import { analyticsCache, CACHE_TTL } from '../../utils/analyticsCache'
import { requireFinancialAnalyticsAccess, logAccess } from '../../utils/auth'

// Query timeout in milliseconds (10 seconds)
const QUERY_TIMEOUT = 10000

export default defineEventHandler(async (event) => {
  try {
    // SECURITY: Require admin role for financial analytics
    // Revenue data is sensitive and should only be accessible to admin
    const profile = await requireFinancialAnalyticsAccess(event)

    // Log access for auditing
    logAccess(event, 'analytics/revenue', 'read', true)

    const client = getSupabaseClient()
    const query = getQuery(event)

    // Parse date range parameters
    const startDate = query.startDate as string || format(subMonths(new Date(), 12), 'yyyy-MM-dd')
    const endDate = query.endDate as string || format(new Date(), 'yyyy-MM-dd')
    const period = query.period as string || 'month' // month, quarter, year
    const compareYearAgo = query.compareYearAgo === 'true'

    // Generate cache key (include user ID for security)
    const cacheKey = analyticsCache.constructor.generateKey('revenue', {
      userId: profile.id,
      startDate,
      endDate,
      period,
      compareYearAgo: compareYearAgo.toString()
    })

    // Try to get from cache first
    const cached = analyticsCache.get(cacheKey, CACHE_TTL.MEDIUM)
    if (cached) {
      return cached
    }

    // ============================================================================
    // TOTAL REVENUE METRICS - Using analytics_daily_revenue view
    // ============================================================================

    // Get daily revenue data for the period
    const { data: dailyRevenue, error: revenueError } = await client
      .from('analytics_daily_revenue')
      .select('*')
      .gte('revenue_date', startDate)
      .lte('revenue_date', endDate)

    if (revenueError) throw revenueError

    // Calculate period totals from daily aggregates
    const totalRevenue = (dailyRevenue || []).reduce((sum, d) => sum + (d.total_revenue_cents || 0), 0)
    const totalRefunds = (dailyRevenue || []).reduce((sum, d) => sum + (d.total_refunds_cents || 0), 0)
    const netRevenue = (dailyRevenue || []).reduce((sum, d) => sum + (d.net_revenue_cents || 0), 0)

    // Month totals
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')
    const { data: monthRevenue } = await client
      .from('analytics_daily_revenue')
      .select('net_revenue_cents')
      .gte('revenue_date', monthStart)
      .lte('revenue_date', monthEnd)

    const monthTotal = (monthRevenue || []).reduce((sum, d) => sum + (d.net_revenue_cents || 0), 0)

    // Quarter totals
    const quarterStart = format(startOfQuarter(new Date()), 'yyyy-MM-dd')
    const quarterEnd = format(endOfQuarter(new Date()), 'yyyy-MM-dd')
    const { data: quarterRevenue } = await client
      .from('analytics_daily_revenue')
      .select('net_revenue_cents')
      .gte('revenue_date', quarterStart)
      .lte('revenue_date', quarterEnd)

    const quarterTotal = (quarterRevenue || []).reduce((sum, d) => sum + (d.net_revenue_cents || 0), 0)

    // Year totals
    const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd')
    const yearEnd = format(endOfYear(new Date()), 'yyyy-MM-dd')
    const { data: yearRevenue } = await client
      .from('analytics_daily_revenue')
      .select('net_revenue_cents')
      .gte('revenue_date', yearStart)
      .lte('revenue_date', yearEnd)

    const yearTotal = (yearRevenue || []).reduce((sum, d) => sum + (d.net_revenue_cents || 0), 0)

    // ============================================================================
    // REVENUE BY SOURCE - Using analytics_revenue_by_type view
    // ============================================================================

    // Get revenue by type (tickets, tuition, merchandise, etc.)
    const startMonth = format(new Date(startDate), 'yyyy-MM')
    const endMonth = format(new Date(endDate), 'yyyy-MM')

    const { data: revenueByType } = await client
      .from('analytics_revenue_by_type')
      .select('*')
      .gte('month', startMonth)
      .lte('month', endMonth)

    // Aggregate by payment type
    const revenueByTypeMap = (revenueByType || []).reduce((acc, row) => {
      const type = row.payment_type || 'other'
      acc[type] = (acc[type] || 0) + (row.net_revenue_cents || 0)
      return acc
    }, {} as Record<string, number>)

    const ticketTotal = revenueByTypeMap['ticket_order'] || 0
    const tuitionTotal = revenueByTypeMap['tuition'] || 0
    const merchandiseTotal = revenueByTypeMap['merchandise'] || 0
    const recitalFeeTotal = revenueByTypeMap['recital_fee'] || 0
    const otherTotal = (revenueByTypeMap['other'] || 0) + (revenueByTypeMap['studio_credit'] || 0)

    // ============================================================================
    // REVENUE TRENDS OVER TIME - Using daily revenue data
    // ============================================================================

    // Build time series data based on period from daily revenue
    const trendsMap = new Map()

    ;(dailyRevenue || []).forEach(day => {
      const date = new Date(day.revenue_date)
      let key: string

      if (period === 'month') {
        key = format(date, 'yyyy-MM')
      } else if (period === 'quarter') {
        key = format(startOfQuarter(date), 'yyyy-MM')
      } else {
        key = format(date, 'yyyy')
      }

      const existing = trendsMap.get(key) || { revenue: 0, refunds: 0, netRevenue: 0, count: 0 }
      trendsMap.set(key, {
        revenue: existing.revenue + (day.total_revenue_cents || 0),
        refunds: existing.refunds + (day.total_refunds_cents || 0),
        netRevenue: existing.netRevenue + (day.net_revenue_cents || 0),
        count: existing.count + (day.transaction_count || 0)
      })
    })

    const trends = Array.from(trendsMap.entries()).map(([period, data]) => ({
      period,
      revenue: data.revenue,
      refunds: data.refunds,
      netRevenue: data.netRevenue,
      transactionCount: data.count
    })).sort((a, b) => a.period.localeCompare(b.period))

    // ============================================================================
    // YEAR-OVER-YEAR COMPARISON - Using analytics_daily_revenue view
    // ============================================================================

    let yearAgoComparison = null

    if (compareYearAgo) {
      const yearAgoStart = format(subYears(new Date(startDate), 1), 'yyyy-MM-dd')
      const yearAgoEnd = format(subYears(new Date(endDate), 1), 'yyyy-MM-dd')

      const { data: yearAgoRevenue } = await client
        .from('analytics_daily_revenue')
        .select('net_revenue_cents')
        .gte('revenue_date', yearAgoStart)
        .lte('revenue_date', yearAgoEnd)

      const yearAgoTotal = (yearAgoRevenue || []).reduce((sum, d) => sum + (d.net_revenue_cents || 0), 0)
      const percentChange = yearAgoTotal > 0 ? ((netRevenue - yearAgoTotal) / yearAgoTotal) * 100 : 0

      yearAgoComparison = {
        currentPeriod: netRevenue,
        previousPeriod: yearAgoTotal,
        difference: netRevenue - yearAgoTotal,
        percentChange: Math.round(percentChange * 100) / 100
      }
    }

    // ============================================================================
    // TOP REVENUE-GENERATING CLASSES - Using analytics_enrollment_stats view
    // ============================================================================

    const { data: classStats, error: classStatsError } = await client
      .from('analytics_enrollment_stats')
      .select('class_name, dance_style, total_tuition_collected_cents')
      .not('total_tuition_collected_cents', 'is', null)
      .order('total_tuition_collected_cents', { ascending: false })
      .limit(10)

    if (classStatsError) throw classStatsError

    const topClasses = (classStats || []).map(cls => ({
      className: `${cls.class_name} (${cls.dance_style})`,
      revenue: cls.total_tuition_collected_cents || 0
    }))

    // ============================================================================
    // TEACHER REVENUE CONTRIBUTION - Using analytics_enrollment_stats view
    // ============================================================================

    const { data: teacherStats, error: teacherStatsError } = await client
      .from('analytics_enrollment_stats')
      .select('teacher_name, total_tuition_collected_cents')
      .not('teacher_name', 'is', null)
      .not('total_tuition_collected_cents', 'is', null)

    if (teacherStatsError) throw teacherStatsError

    // Aggregate by teacher
    const teacherRevenueMap = new Map()
    ;(teacherStats || []).forEach(cls => {
      const teacherName = cls.teacher_name
      const existing = teacherRevenueMap.get(teacherName) || { name: teacherName, revenue: 0, classes: 0 }

      teacherRevenueMap.set(teacherName, {
        name: existing.name,
        revenue: existing.revenue + (cls.total_tuition_collected_cents || 0),
        classes: existing.classes + 1
      })
    })

    const teacherContributions = Array.from(teacherRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)

    // ============================================================================
    // OUTSTANDING REVENUE - Using analytics_outstanding_balances view
    // ============================================================================

    const { data: outstandingBalances, error: outstandingError } = await client
      .from('analytics_outstanding_balances')
      .select('total_balance_cents, overdue_balance_cents, parent_name')

    if (outstandingError) throw outstandingError

    const outstandingRevenue = (outstandingBalances || []).reduce(
      (sum, b) => sum + (b.total_balance_cents || 0),
      0
    )

    const overdueRevenue = (outstandingBalances || []).reduce(
      (sum, b) => sum + (b.overdue_balance_cents || 0),
      0
    )

    const invoiceCount = (outstandingBalances || []).length

    // ============================================================================
    // REFUND IMPACT - Using analytics_refund_summary view
    // ============================================================================

    const { data: refundSummary, error: refundError } = await client
      .from('analytics_refund_summary')
      .select('*')
      .gte('refund_month', startMonth)
      .lte('refund_month', endMonth)

    // Aggregate refunds by payment method
    const refundsByMethod = (refundSummary || []).reduce((acc, r) => {
      const method = r.payment_method || 'unknown'
      acc[method] = (acc[method] || 0) + (r.total_refund_cents || 0)
      return acc
    }, {} as Record<string, number>)

    // ============================================================================
    // RETURN RESPONSE
    // ============================================================================

    const totalTransactionCount = (dailyRevenue || []).reduce((sum, d) => sum + (d.transaction_count || 0), 0)

    const result = {
      dateRange: {
        startDate,
        endDate,
        period
      },
      totals: {
        revenue: totalRevenue,
        refunds: totalRefunds,
        netRevenue,
        transactionCount: totalTransactionCount,
        month: monthTotal,
        quarter: quarterTotal,
        year: yearTotal
      },
      revenueBySource: {
        tickets: ticketTotal,
        tuition: tuitionTotal,
        merchandise: merchandiseTotal,
        recitalFee: recitalFeeTotal,
        other: otherTotal
      },
      trends,
      yearAgoComparison,
      topClasses,
      teacherContributions,
      outstanding: {
        total: outstandingRevenue,
        overdue: overdueRevenue,
        invoiceCount: invoiceCount
      },
      refunds: {
        total: totalRefunds,
        byMethod: refundsByMethod
      }
    }

    // Cache the result
    analyticsCache.set(cacheKey, result)

    return result
  } catch (error: any) {
    console.error('Revenue analytics error:', error)

    // Handle query timeout
    if (error?.code === 'PGRST301' || error?.message?.includes('timeout')) {
      return createError({
        statusCode: 504,
        statusMessage: 'Analytics query took too long. Try a shorter date range.'
      })
    }

    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch revenue analytics'
    })
  }
})
