// server/api/admin/ticketing/dashboard.get.ts

import { requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '~/server/utils/supabase'

/**
 * GET /api/admin/ticketing/dashboard
 * Get ticketing dashboard analytics and metrics
 * Requires: Admin or Staff role
 */
export default defineEventHandler(async (event) => {
  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const query = getQuery(event)

  // Parse date range filter
  const dateFrom = query.date_from as string | undefined
  const dateTo = query.date_to as string | undefined

  try {
    // 1. Get total tickets sold and revenue by show
    let showStatsQuery = client
      .from('ticket_orders')
      .select(
        `
        show_id,
        total_amount_cents,
        status,
        created_at,
        show:recital_shows!ticket_orders_show_id_fkey (
          id,
          title,
          show_date,
          show_time,
          venue:venues (
            id,
            name,
            capacity
          )
        ),
        tickets (
          id
        )
      `
      )
      .eq('status', 'confirmed')

    // Apply date filters
    if (dateFrom) {
      showStatsQuery = showStatsQuery.gte('created_at', dateFrom)
    }
    if (dateTo) {
      showStatsQuery = showStatsQuery.lte('created_at', dateTo)
    }

    const { data: orders, error: ordersError } = await showStatsQuery

    if (ordersError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Failed to fetch show statistics',
        message: ordersError.message
      })
    }

    // Aggregate by show
    const showStatsMap = new Map<
      string,
      {
        show_id: string
        show_title: string
        show_date: string
        show_time: string | null
        venue_name: string | null
        venue_capacity: number | null
        tickets_sold: number
        total_revenue_cents: number
      }
    >()

    orders?.forEach((order: any) => {
      const showId = order.show_id
      const ticketCount = order.tickets?.length || 0

      if (!showStatsMap.has(showId)) {
        showStatsMap.set(showId, {
          show_id: showId,
          show_title: order.show?.title || 'Unknown Show',
          show_date: order.show?.show_date || '',
          show_time: order.show?.show_time || null,
          venue_name: order.show?.venue?.name || null,
          venue_capacity: order.show?.venue?.capacity || null,
          tickets_sold: 0,
          total_revenue_cents: 0
        })
      }

      const stats = showStatsMap.get(showId)!
      stats.tickets_sold += ticketCount
      stats.total_revenue_cents += order.total_amount_cents || 0
    })

    const showStats = Array.from(showStatsMap.values()).sort(
      (a, b) => new Date(b.show_date).getTime() - new Date(a.show_date).getTime()
    )

    // 2. Get recent orders (last 10)
    let recentOrdersQuery = client
      .from('ticket_orders')
      .select(
        `
        id,
        order_number,
        customer_name,
        customer_email,
        total_amount_cents,
        status,
        created_at,
        show:recital_shows!ticket_orders_show_id_fkey (
          id,
          title,
          show_date
        ),
        tickets (
          id
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(10)

    if (dateFrom) {
      recentOrdersQuery = recentOrdersQuery.gte('created_at', dateFrom)
    }
    if (dateTo) {
      recentOrdersQuery = recentOrdersQuery.lte('created_at', dateTo)
    }

    const { data: recentOrders, error: recentError } = await recentOrdersQuery

    if (recentError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Failed to fetch recent orders',
        message: recentError.message
      })
    }

    // 3. Get upcoming shows with availability
    const { data: upcomingShows, error: showsError } = await client
      .from('recital_shows')
      .select(
        `
        id,
        title,
        show_date,
        show_time,
        venue:venues!recital_shows_venue_id_fkey (
          id,
          name,
          capacity
        )
      `
      )
      .gte('show_date', new Date().toISOString().split('T')[0])
      .order('show_date', { ascending: true })
      .limit(10)

    if (showsError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Failed to fetch upcoming shows',
        message: showsError.message
      })
    }

    // Get sold ticket counts for upcoming shows
    const upcomingShowsWithAvailability = await Promise.all(
      (upcomingShows || []).map(async (show: any) => {
        const { data: soldSeats } = await client
          .from('show_seats')
          .select('id')
          .eq('show_id', show.id)
          .eq('status', 'sold')

        const soldCount = soldSeats?.length || 0
        const capacity = show.venue?.capacity || 0
        const available = Math.max(0, capacity - soldCount)

        return {
          id: show.id,
          title: show.title,
          show_date: show.show_date,
          show_time: show.show_time,
          venue_name: show.venue?.name,
          capacity,
          sold: soldCount,
          available,
          sold_percentage: capacity > 0 ? Math.round((soldCount / capacity) * 100) : 0
        }
      })
    )

    // 4. Get seat sales heat map data (by section and row)
    // For all shows or filtered by date range
    let seatHeatMapQuery = client
      .from('show_seats')
      .select(
        `
        id,
        status,
        seat:seats!show_seats_seat_id_fkey (
          id,
          row_name,
          seat_number,
          section:venue_sections!seats_section_id_fkey (
            id,
            name
          )
        ),
        show:recital_shows!show_seats_show_id_fkey (
          id,
          show_date
        )
      `
      )

    const { data: allShowSeats, error: seatsError } = await seatHeatMapQuery

    if (seatsError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Failed to fetch seat heat map data',
        message: seatsError.message
      })
    }

    // Filter by date range if provided
    let filteredSeats = allShowSeats || []
    if (dateFrom || dateTo) {
      filteredSeats = filteredSeats.filter((showSeat: any) => {
        const showDate = showSeat.show?.show_date
        if (!showDate) return false

        if (dateFrom && showDate < dateFrom) return false
        if (dateTo && showDate > dateTo) return false

        return true
      })
    }

    // Aggregate seat sales by section and row
    const seatHeatMap = new Map<
      string,
      {
        section: string
        row: string
        total_seats: number
        sold_seats: number
        reserved_seats: number
        available_seats: number
      }
    >()

    filteredSeats.forEach((showSeat: any) => {
      const sectionName = showSeat.seat?.section?.name || 'Unknown'
      const rowName = showSeat.seat?.row_name || 'Unknown'
      const key = `${sectionName}:${rowName}`

      if (!seatHeatMap.has(key)) {
        seatHeatMap.set(key, {
          section: sectionName,
          row: rowName,
          total_seats: 0,
          sold_seats: 0,
          reserved_seats: 0,
          available_seats: 0
        })
      }

      const heatData = seatHeatMap.get(key)!
      heatData.total_seats += 1

      if (showSeat.status === 'sold') {
        heatData.sold_seats += 1
      } else if (showSeat.status === 'reserved') {
        heatData.reserved_seats += 1
      } else if (showSeat.status === 'available') {
        heatData.available_seats += 1
      }
    })

    const seatHeatMapData = Array.from(seatHeatMap.values()).sort((a, b) => {
      // Sort by section, then by row
      if (a.section !== b.section) {
        return a.section.localeCompare(b.section)
      }
      return a.row.localeCompare(b.row)
    })

    // 5. Calculate overall metrics
    const totalTicketsSold = showStats.reduce((sum, show) => sum + show.tickets_sold, 0)
    const totalRevenue = showStats.reduce((sum, show) => sum + show.total_revenue_cents, 0)
    const totalOrders = orders?.length || 0

    return {
      metrics: {
        total_tickets_sold: totalTicketsSold,
        total_revenue_cents: totalRevenue,
        total_orders: totalOrders,
        average_order_value_cents:
          totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
      },
      show_stats: showStats,
      recent_orders: recentOrders?.map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        total_amount_cents: order.total_amount_cents,
        status: order.status,
        created_at: order.created_at,
        show_title: order.show?.title,
        show_date: order.show?.show_date,
        ticket_count: order.tickets?.length || 0
      })),
      upcoming_shows: upcomingShowsWithAvailability,
      seat_heat_map: seatHeatMapData
    }
  } catch (error: any) {
    console.error('Dashboard API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error',
      message: error.message
    })
  }
})
