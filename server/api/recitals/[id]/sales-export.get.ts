// API Endpoint: Export sales data to CSV
// Story 2.1.3: Enhanced Ticket Sales Dashboard
// Generates CSV file of all sales data for a recital

import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const recitalId = getRouterParam(event, 'id')

  if (!recitalId) {
    throw createError({
      statusCode: 400,
      message: 'Recital ID is required'
    })
  }

  const client = getSupabaseClient()

  try {
    // Get recital info
    const { data: recital } = await client
      .from('recitals')
      .select('name')
      .eq('id', recitalId)
      .single()

    // Get all orders with show and ticket details
    const { data: orders, error: ordersError } = await client
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        customer_phone,
        total_amount,
        discount_amount,
        channel,
        status,
        created_at,
        recital_shows!inner (
          id,
          show_date,
          show_time,
          recital_id
        ),
        tickets (
          id,
          seat_number,
          section,
          price,
          status
        )
      `)
      .eq('recital_shows.recital_id', recitalId)
      .order('created_at', { ascending: false })

    if (ordersError) throw ordersError

    // Generate CSV content
    const csvRows: string[] = []

    // Header row
    csvRows.push([
      'Order Number',
      'Order Date',
      'Show Date',
      'Show Time',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Channel',
      'Tickets',
      'Subtotal',
      'Discount',
      'Total',
      'Status',
      'Seats'
    ].join(','))

    // Data rows
    orders?.forEach((order: any) => {
      const showDate = order.recital_shows?.show_date
        ? new Date(order.recital_shows.show_date).toLocaleDateString()
        : ''
      const showTime = order.recital_shows?.show_time || ''
      const orderDate = new Date(order.created_at).toLocaleDateString()
      const ticketCount = order.tickets?.length || 0
      const seats = order.tickets?.map((t: any) => `${t.section}-${t.seat_number}`).join('; ') || ''
      const subtotal = parseFloat(order.total_amount) + parseFloat(order.discount_amount || 0)

      csvRows.push([
        `"${order.order_number}"`,
        `"${orderDate}"`,
        `"${showDate}"`,
        `"${showTime}"`,
        `"${order.customer_name || ''}"`,
        `"${order.customer_email || ''}"`,
        `"${order.customer_phone || ''}"`,
        `"${order.channel || 'online'}"`,
        ticketCount,
        subtotal.toFixed(2),
        parseFloat(order.discount_amount || 0).toFixed(2),
        parseFloat(order.total_amount).toFixed(2),
        `"${order.status}"`,
        `"${seats}"`
      ].join(','))
    })

    const csvContent = csvRows.join('\n')

    // Set headers for CSV download
    const fileName = `${recital?.name?.replace(/[^a-z0-9]/gi, '_')}_sales_${new Date().toISOString().split('T')[0]}.csv`

    setResponseHeaders(event, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${fileName}"`
    })

    return csvContent
  } catch (error: any) {
    console.error('Error exporting sales data:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to export sales data'
    })
  }
})
