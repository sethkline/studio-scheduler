// server/api/admin/ticketing/dashboard.get.ts

import type {
  DashboardData,
  ShowSalesStats,
  RevenueBreakdown,
  OrderWithDetails
} from '~/types'

/**
 * GET /api/admin/ticketing/dashboard
 * Fetch ticketing analytics dashboard data
 * Requires: Admin or Staff role
 */
export default defineEventHandler(async (event) => {
  // Require admin or staff role
  await requireAdminOrStaff(event)

  const client = getSupabaseClient()
  const query = getQuery(event)

  // Parse query parameters
  const {
    date_from,
    date_to,
    show_id
  } = query

  // Default date range: last 30 days
  const now = new Date()
  const defaultStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const startDate = date_from ? new Date(date_from as string) : defaultStartDate
  const endDate = date_to ? new Date(date_to as string) : now

  try {
    // ========================================
    // 1. REVENUE BREAKDOWN
    // ========================================
    let revenueQuery = client
      .from('ticket_orders')
      .select('status, total_amount_in_cents, order_items(*)')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (show_id) {
      revenueQuery = revenueQuery.eq('show_id', show_id)
    }

    const { data: orders, error: ordersError } = await revenueQuery

    if (ordersError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Failed to fetch revenue data',
        message: ordersError.message
      })
    }

    // Calculate revenue breakdown
    const revenueBreakdown: RevenueBreakdown = {
      total_revenue_in_cents: 0,
      ticket_revenue_in_cents: 0,
      upsell_revenue_in_cents: 0,
      pending_revenue_in_cents: 0,
      refunded_revenue_in_cents: 0,
      total_orders: orders?.length || 0,
      total_tickets_sold: 0
    }

    orders?.forEach((order: any) => {
      const amount = order.total_amount_in_cents || 0

      if (order.status === 'paid') {
        revenueBreakdown.total_revenue_in_cents += amount

        // Calculate ticket vs upsell revenue
        order.order_items?.forEach((item: any) => {
          if (item.item_type === 'ticket') {
            revenueBreakdown.ticket_revenue_in_cents += (item.price_in_cents * item.quantity)
            revenueBreakdown.total_tickets_sold += item.quantity
          } else {
            revenueBreakdown.upsell_revenue_in_cents += (item.price_in_cents * item.quantity)
          }
        })
      } else if (order.status === 'pending') {
        revenueBreakdown.pending_revenue_in_cents += amount
      } else if (order.status === 'refunded') {
        revenueBreakdown.refunded_revenue_in_cents += amount
      }
    })

    // ========================================
    // 2. SHOW SALES STATS
    // ========================================
    let showsQuery = client
      .from('recital_shows')
      .select(`
        id,
        title,
        show_date,
        show_time,
        venue_id,
        venues!inner (
          id,
          name
        )
      `)
      .gte('show_date', startDate.toISOString().split('T')[0])
      .lte('show_date', endDate.toISOString().split('T')[0])
      .order('show_date', { ascending: true })

    if (show_id) {
      showsQuery = showsQuery.eq('id', show_id)
    }

    const { data: shows, error: showsError } = await showsQuery

    if (showsError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Failed to fetch shows',
        message: showsError.message
      })
    }

    // Get stats for each show
    const showSalesStats: ShowSalesStats[] = []

    for (const show of shows || []) {
      // Get seat statistics
      const { data: seatStats, error: statsError } = await client
        .rpc('get_seat_availability_stats', { p_show_id: show.id })

      if (statsError) {
        console.error('Failed to fetch seat stats for show', show.id, statsError)
        continue
      }

      // Get revenue for this show
      const { data: showOrders, error: showOrdersError } = await client
        .from('ticket_orders')
        .select('total_amount_in_cents, tickets(id)')
        .eq('show_id', show.id)
        .eq('status', 'paid')

      if (showOrdersError) {
        console.error('Failed to fetch orders for show', show.id, showOrdersError)
        continue
      }

      const totalRevenue = showOrders?.reduce((sum, order) => sum + (order.total_amount_in_cents || 0), 0) || 0
      const totalTicketsSold = showOrders?.reduce((sum, order) => sum + (order.tickets?.length || 0), 0) || 0

      const stats = seatStats || {
        total_seats: 0,
        available_seats: 0,
        reserved_seats: 0,
        sold_seats: 0,
        held_seats: 0
      }

      const totalSeats = stats.total_seats || 0
      const soldSeats = stats.sold_seats || 0
      const soldPercentage = totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0

      showSalesStats.push({
        show_id: show.id,
        show_title: show.title,
        show_date: show.show_date,
        show_time: show.show_time,
        venue_name: (show.venues as any)?.name || 'Unknown',
        total_tickets_sold: totalTicketsSold,
        total_revenue_in_cents: totalRevenue,
        total_seats: totalSeats,
        available_seats: stats.available_seats || 0,
        reserved_seats: stats.reserved_seats || 0,
        sold_seats: soldSeats,
        sold_percentage: soldPercentage
      })
    }

    // ========================================
    // 3. RECENT ORDERS (Last 10)
    // ========================================
    let recentOrdersQuery = client
      .from('ticket_orders')
      .select(`
        *,
        show:recital_shows!ticket_orders_show_id_fkey (
          id,
          title,
          show_date,
          show_time
        ),
        tickets (
          id,
          ticket_number,
          show_seat:show_seats (
            id,
            seat:seats (
              id,
              row_name,
              seat_number,
              section:venue_sections (
                id,
                name
              )
            )
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (show_id) {
      recentOrdersQuery = recentOrdersQuery.eq('show_id', show_id)
    }

    const { data: recentOrders, error: recentOrdersError } = await recentOrdersQuery

    if (recentOrdersError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Failed to fetch recent orders',
        message: recentOrdersError.message
      })
    }

    // Transform recent orders
    const recentOrdersWithDetails: OrderWithDetails[] = (recentOrders || []).map((order: any) => {
      const tickets = order.tickets || []
      const seatNumbers = tickets
        .map((t: any) => {
          const seat = t.show_seat?.seat
          if (!seat) return null
          const section = seat.section?.name || ''
          return `${section} ${seat.row_name}${seat.seat_number}`
        })
        .filter(Boolean)
        .join(', ')

      return {
        ...order,
        show: order.show || undefined,
        ticket_count: tickets.length,
        seat_numbers: seatNumbers
      }
    })

    // ========================================
    // 4. UPCOMING SHOWS (Next 30 days with availability)
    // ========================================
    const upcomingStartDate = new Date()
    const upcomingEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const { data: upcomingShows, error: upcomingShowsError } = await client
      .from('recital_shows')
      .select(`
        id,
        title,
        show_date,
        show_time,
        venue_id,
        venues!inner (
          id,
          name
        )
      `)
      .gte('show_date', upcomingStartDate.toISOString().split('T')[0])
      .lte('show_date', upcomingEndDate.toISOString().split('T')[0])
      .order('show_date', { ascending: true })

    if (upcomingShowsError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Failed to fetch upcoming shows',
        message: upcomingShowsError.message
      })
    }

    // Get stats for upcoming shows
    const upcomingShowsStats: ShowSalesStats[] = []

    for (const show of upcomingShows || []) {
      const { data: seatStats } = await client
        .rpc('get_seat_availability_stats', { p_show_id: show.id })

      const { data: showOrders } = await client
        .from('ticket_orders')
        .select('total_amount_in_cents, tickets(id)')
        .eq('show_id', show.id)
        .eq('status', 'paid')

      const totalRevenue = showOrders?.reduce((sum, order) => sum + (order.total_amount_in_cents || 0), 0) || 0
      const totalTicketsSold = showOrders?.reduce((sum, order) => sum + (order.tickets?.length || 0), 0) || 0

      const stats = seatStats || {
        total_seats: 0,
        available_seats: 0,
        reserved_seats: 0,
        sold_seats: 0,
        held_seats: 0
      }

      const totalSeats = stats.total_seats || 0
      const soldSeats = stats.sold_seats || 0
      const soldPercentage = totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0

      upcomingShowsStats.push({
        show_id: show.id,
        show_title: show.title,
        show_date: show.show_date,
        show_time: show.show_time,
        venue_name: (show.venues as any)?.name || 'Unknown',
        total_tickets_sold: totalTicketsSold,
        total_revenue_in_cents: totalRevenue,
        total_seats: totalSeats,
        available_seats: stats.available_seats || 0,
        reserved_seats: stats.reserved_seats || 0,
        sold_seats: soldSeats,
        sold_percentage: soldPercentage
      })
    }

    // ========================================
    // RETURN DASHBOARD DATA
    // ========================================
    const dashboardData: DashboardData = {
      revenue_breakdown: revenueBreakdown,
      show_sales_stats: showSalesStats,
      recent_orders: recentOrdersWithDetails,
      upcoming_shows: upcomingShowsStats,
      date_range: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      }
    }

    return {
      success: true,
      data: dashboardData
    }
  } catch (error: any) {
    console.error('Dashboard API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch dashboard data',
      message: error.message
    })
  }
})
