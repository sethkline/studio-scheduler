// API Endpoint: Get comprehensive sales analytics for a recital
// Story 2.1.3: Enhanced Ticket Sales Dashboard
// Returns detailed sales metrics, trends, and projections

import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const recitalId = getRouterParam(event, 'id')

  if (!recitalId) {
    throw createError({
      statusCode: 400,
      message: 'Recital ID is required'
    })
  }

  const client = await getUserSupabaseClient(event)

  try {
    // Get overall recital sales summary
    const { data: summary, error: summaryError } = await client
      .from('recital_sales_summary')
      .select('*')
      .eq('recital_id', recitalId)
      .single()

    // Get sales by show
    const { data: showSales, error: showSalesError } = await client
      .from('show_sales_summary')
      .select('*')
      .eq('recital_id', recitalId)
      .order('show_date')

    // Get daily sales trend
    const { data: dailySales, error: dailySalesError } = await client
      .from('daily_sales_stats')
      .select('*')
      .order('sale_date')
      .limit(30) // Last 30 days

    // Calculate sales velocity (tickets per day)
    const velocityData = dailySales?.reduce((acc: any[], sale: any) => {
      const existingDate = acc.find(d => d.date === sale.sale_date)
      if (existingDate) {
        existingDate.count += sale.order_count || 0
      } else {
        acc.push({
          date: sale.sale_date,
          count: sale.order_count || 0
        })
      }
      return acc
    }, []) || []

    // Get sales by channel
    const { data: channelData } = await client
      .from('orders')
      .select('channel, total_amount')
      .in('show_id', showSales?.map(s => s.show_id) || [])
      .eq('status', 'completed')

    const salesByChannel = channelData?.reduce((acc: any, order: any) => {
      const channel = order.channel || 'online'
      if (!acc[channel]) {
        acc[channel] = { count: 0, revenue: 0 }
      }
      acc[channel].count++
      acc[channel].revenue += parseFloat(order.total_amount) || 0
      return acc
    }, {}) || {}

    // Get discount effectiveness
    const { data: discountData } = await client
      .from('discount_code_analytics')
      .select('*')
      .eq('recital_id', recitalId)

    // Get peak sales hours
    const { data: peakHours } = await client
      .rpc('get_peak_sales_hours', { recital_uuid: recitalId })

    // Get sales projections
    const { data: projection } = await client
      .rpc('calculate_sales_projection', { recital_uuid: recitalId })
      .single()

    // Calculate seat availability
    const totalSeatsData = await Promise.all(
      (showSales || []).map(async (show: any) => {
        const { count } = await client
          .from('show_seats')
          .select('*', { count: 'exact', head: true })
          .eq('show_id', show.show_id)

        const { count: soldCount } = await client
          .from('show_seats')
          .select('*', { count: 'exact', head: true })
          .eq('show_id', show.show_id)
          .eq('status', 'sold')

        return {
          show_id: show.show_id,
          total_seats: count || 0,
          sold_seats: soldCount || 0,
          available_seats: (count || 0) - (soldCount || 0)
        }
      })
    )

    const totalSeats = totalSeatsData.reduce((sum, show) => sum + show.total_seats, 0)
    const soldSeats = totalSeatsData.reduce((sum, show) => sum + show.sold_seats, 0)
    const availableSeats = totalSeats - soldSeats

    return {
      summary: {
        totalOrders: summary?.total_orders || 0,
        ticketsSold: summary?.total_tickets_sold || 0,
        totalRevenue: summary?.total_revenue || 0,
        totalDiscounts: summary?.total_discounts || 0,
        avgOrderValue: summary?.avg_order_value || 0,
        uniqueCustomers: summary?.unique_customers || 0,
        ticketsPerDay: summary?.tickets_per_day || 0
      },
      seating: {
        totalSeats,
        soldSeats,
        availableSeats,
        percentageSold: totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0,
        byShow: totalSeatsData
      },
      showBreakdown: showSales?.map((show: any) => ({
        showId: show.show_id,
        date: show.show_date,
        time: show.show_time,
        orders: show.total_orders || 0,
        ticketsSold: show.tickets_sold || 0,
        revenue: show.total_revenue || 0,
        avgOrderValue: show.avg_order_value || 0,
        onlineOrders: show.online_orders || 0,
        boxOfficeOrders: show.box_office_orders || 0,
        phoneOrders: show.phone_orders || 0
      })) || [],
      salesVelocity: velocityData,
      channelBreakdown: Object.entries(salesByChannel).map(([channel, data]: any) => ({
        channel,
        orders: data.count,
        revenue: data.revenue,
        percentage: summary?.total_orders ? Math.round((data.count / summary.total_orders) * 100) : 0
      })),
      discountEffectiveness: discountData || [],
      peakSalesHours: peakHours?.slice(0, 5) || [],
      projection: projection || {
        projected_tickets: 0,
        projected_revenue: 0,
        days_until_show: 0,
        current_velocity: 0
      }
    }
  } catch (error: any) {
    console.error('Error fetching sales analytics:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch sales analytics'
    })
  }
})
