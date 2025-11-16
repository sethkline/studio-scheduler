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
    // TOTAL REVENUE METRICS
    // ============================================================================

    // Current period totals
    const { data: currentRevenue, error: revenueError } = await client
      .from('payments')
      .select('amount_in_cents, refund_amount_in_cents, payment_method, created_at')
      .eq('payment_status', 'completed')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)

    if (revenueError) throw revenueError

    // Calculate totals
    const totalRevenue = currentRevenue.reduce((sum, p) => sum + (p.amount_in_cents || 0), 0)
    const totalRefunds = currentRevenue.reduce((sum, p) => sum + (p.refund_amount_in_cents || 0), 0)
    const netRevenue = totalRevenue - totalRefunds

    // Month totals
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')
    const { data: monthRevenue } = await client
      .from('payments')
      .select('amount_in_cents, refund_amount_in_cents')
      .eq('payment_status', 'completed')
      .gte('payment_date', monthStart)
      .lte('payment_date', monthEnd)

    const monthTotal = (monthRevenue || []).reduce((sum, p) => sum + (p.amount_in_cents || 0) - (p.refund_amount_in_cents || 0), 0)

    // Quarter totals
    const quarterStart = format(startOfQuarter(new Date()), 'yyyy-MM-dd')
    const quarterEnd = format(endOfQuarter(new Date()), 'yyyy-MM-dd')
    const { data: quarterRevenue } = await client
      .from('payments')
      .select('amount_in_cents, refund_amount_in_cents')
      .eq('payment_status', 'completed')
      .gte('payment_date', quarterStart)
      .lte('payment_date', quarterEnd)

    const quarterTotal = (quarterRevenue || []).reduce((sum, p) => sum + (p.amount_in_cents || 0) - (p.refund_amount_in_cents || 0), 0)

    // Year totals
    const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd')
    const yearEnd = format(endOfYear(new Date()), 'yyyy-MM-dd')
    const { data: yearRevenue } = await client
      .from('payments')
      .select('amount_in_cents, refund_amount_in_cents')
      .eq('payment_status', 'completed')
      .gte('payment_date', yearStart)
      .lte('payment_date', yearEnd)

    const yearTotal = (yearRevenue || []).reduce((sum, p) => sum + (p.amount_in_cents || 0) - (p.refund_amount_in_cents || 0), 0)

    // ============================================================================
    // REVENUE BY SOURCE
    // ============================================================================

    // Revenue breakdown by source (tickets vs tuition)
    const { data: ticketRevenue } = await client
      .from('payments')
      .select('amount_in_cents, refund_amount_in_cents')
      .eq('payment_status', 'completed')
      .not('order_id', 'is', null)
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)

    const { data: tuitionRevenue } = await client
      .from('payments')
      .select('amount_in_cents, refund_amount_in_cents')
      .eq('payment_status', 'completed')
      .not('invoice_id', 'is', null)
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)

    const ticketTotal = (ticketRevenue || []).reduce((sum, p) => sum + (p.amount_in_cents || 0) - (p.refund_amount_in_cents || 0), 0)
    const tuitionTotal = (tuitionRevenue || []).reduce((sum, p) => sum + (p.amount_in_cents || 0) - (p.refund_amount_in_cents || 0), 0)
    const otherTotal = netRevenue - ticketTotal - tuitionTotal

    // ============================================================================
    // REVENUE TRENDS OVER TIME
    // ============================================================================

    // Build time series data based on period
    const trendsMap = new Map()

    currentRevenue.forEach(payment => {
      const date = new Date(payment.created_at)
      let key: string

      if (period === 'month') {
        key = format(date, 'yyyy-MM')
      } else if (period === 'quarter') {
        key = format(startOfQuarter(date), 'yyyy-MM')
      } else {
        key = format(date, 'yyyy')
      }

      const existing = trendsMap.get(key) || { revenue: 0, refunds: 0, count: 0 }
      trendsMap.set(key, {
        revenue: existing.revenue + (payment.amount_in_cents || 0),
        refunds: existing.refunds + (payment.refund_amount_in_cents || 0),
        count: existing.count + 1
      })
    })

    const trends = Array.from(trendsMap.entries()).map(([period, data]) => ({
      period,
      revenue: data.revenue,
      refunds: data.refunds,
      netRevenue: data.revenue - data.refunds,
      transactionCount: data.count
    })).sort((a, b) => a.period.localeCompare(b.period))

    // ============================================================================
    // YEAR-OVER-YEAR COMPARISON
    // ============================================================================

    let yearAgoComparison = null

    if (compareYearAgo) {
      const yearAgoStart = format(subYears(new Date(startDate), 1), 'yyyy-MM-dd')
      const yearAgoEnd = format(subYears(new Date(endDate), 1), 'yyyy-MM-dd')

      const { data: yearAgoRevenue } = await client
        .from('payments')
        .select('amount_in_cents, refund_amount_in_cents')
        .eq('payment_status', 'completed')
        .gte('payment_date', yearAgoStart)
        .lte('payment_date', yearAgoEnd)

      const yearAgoTotal = (yearAgoRevenue || []).reduce((sum, p) => sum + (p.amount_in_cents || 0) - (p.refund_amount_in_cents || 0), 0)
      const percentChange = yearAgoTotal > 0 ? ((netRevenue - yearAgoTotal) / yearAgoTotal) * 100 : 0

      yearAgoComparison = {
        currentPeriod: netRevenue,
        previousPeriod: yearAgoTotal,
        difference: netRevenue - yearAgoTotal,
        percentChange: Math.round(percentChange * 100) / 100
      }
    }

    // ============================================================================
    // TOP REVENUE-GENERATING CLASSES
    // ============================================================================

    const { data: classRevenue, error: classRevenueError } = await client
      .from('invoice_items')
      .select(`
        total_price_in_cents,
        class_instance:class_instance_id (
          id,
          class_definition:class_definition_id (
            name,
            dance_style:dance_style_id (name)
          )
        )
      `)
      .eq('item_type', 'tuition')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (classRevenueError) throw classRevenueError

    // Aggregate by class
    const classRevenueMap = new Map()
    classRevenue?.forEach(item => {
      if (!item.class_instance) return

      const className = item.class_instance.class_definition?.name || 'Unknown Class'
      const danceStyle = item.class_instance.class_definition?.dance_style?.name || 'Unknown'
      const key = `${className} (${danceStyle})`

      const existing = classRevenueMap.get(key) || 0
      classRevenueMap.set(key, existing + (item.total_price_in_cents || 0))
    })

    const topClasses = Array.from(classRevenueMap.entries())
      .map(([name, revenue]) => ({ className: name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // ============================================================================
    // TEACHER REVENUE CONTRIBUTION
    // ============================================================================

    const { data: teacherRevenue, error: teacherRevenueError } = await client
      .from('invoice_items')
      .select(`
        total_price_in_cents,
        class_instance:class_instance_id (
          teacher:teacher_id (
            id,
            first_name,
            last_name
          )
        )
      `)
      .eq('item_type', 'tuition')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (teacherRevenueError) throw teacherRevenueError

    // Aggregate by teacher
    const teacherRevenueMap = new Map()
    teacherRevenue?.forEach(item => {
      if (!item.class_instance?.teacher) return

      const teacherId = item.class_instance.teacher.id
      const teacherName = `${item.class_instance.teacher.first_name} ${item.class_instance.teacher.last_name}`

      const existing = teacherRevenueMap.get(teacherId) || { name: teacherName, revenue: 0, classes: 0 }
      teacherRevenueMap.set(teacherId, {
        name: existing.name,
        revenue: existing.revenue + (item.total_price_in_cents || 0),
        classes: existing.classes + 1
      })
    })

    const teacherContributions = Array.from(teacherRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)

    // ============================================================================
    // OUTSTANDING REVENUE (UNPAID INVOICES)
    // ============================================================================

    const { data: unpaidInvoices, error: unpaidError } = await client
      .from('invoices')
      .select('total_amount_in_cents, amount_paid_in_cents, status')
      .in('status', ['sent', 'partially_paid', 'overdue'])

    if (unpaidError) throw unpaidError

    const outstandingRevenue = (unpaidInvoices || []).reduce(
      (sum, inv) => sum + (inv.total_amount_in_cents - inv.amount_paid_in_cents),
      0
    )

    const overdueRevenue = (unpaidInvoices || [])
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.total_amount_in_cents - inv.amount_paid_in_cents), 0)

    // ============================================================================
    // REFUND IMPACT
    // ============================================================================

    const refundsByMethod = currentRevenue.reduce((acc, p) => {
      const method = p.payment_method || 'unknown'
      const refund = p.refund_amount_in_cents || 0
      acc[method] = (acc[method] || 0) + refund
      return acc
    }, {} as Record<string, number>)

    // ============================================================================
    // RETURN RESPONSE
    // ============================================================================

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
        transactionCount: currentRevenue.length,
        month: monthTotal,
        quarter: quarterTotal,
        year: yearTotal
      },
      revenueBySource: {
        tickets: ticketTotal,
        tuition: tuitionTotal,
        other: otherTotal
      },
      trends,
      yearAgoComparison,
      topClasses,
      teacherContributions,
      outstanding: {
        total: outstandingRevenue,
        overdue: overdueRevenue,
        invoiceCount: unpaidInvoices?.length || 0
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
