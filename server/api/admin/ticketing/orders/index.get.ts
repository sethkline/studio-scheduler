// server/api/admin/ticketing/orders/index.get.ts

import { requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'
import type { OrderWithDetails } from '~/types'

/**
 * GET /api/admin/ticketing/orders
 * List all ticket orders with optional filters
 * Requires: Admin or Staff role
 */
export default defineEventHandler(async (event) => {
  // Require admin or staff role
  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const query = getQuery(event)

  // Parse query parameters
  const {
    show_id,
    status,
    date_from,
    date_to,
    search,
    page = 1,
    limit = 20,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = query

  const pageNum = parseInt(page as string, 10)
  const limitNum = parseInt(limit as string, 10)
  const offset = (pageNum - 1) * limitNum

  // Build base query with joins
  let ordersQuery = client
    .from('ticket_orders')
    .select(
      `
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
    `,
      { count: 'exact' }
    )

  // Apply filters
  if (show_id) {
    ordersQuery = ordersQuery.eq('show_id', show_id)
  }

  if (status && status !== 'all') {
    ordersQuery = ordersQuery.eq('status', status)
  }

  if (date_from) {
    ordersQuery = ordersQuery.gte('created_at', date_from)
  }

  if (date_to) {
    ordersQuery = ordersQuery.lte('created_at', date_to)
  }

  if (search) {
    // Search by customer name, email, or order number
    ordersQuery = ordersQuery.or(
      `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,order_number.ilike.%${search}%`
    )
  }

  // Apply sorting
  const sortColumn = sort_by as string
  const sortAscending = sort_order === 'asc'

  ordersQuery = ordersQuery.order(sortColumn, { ascending: sortAscending })

  // Apply pagination
  ordersQuery = ordersQuery.range(offset, offset + limitNum - 1)

  // Execute query
  const { data: orders, error, count } = await ordersQuery

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Failed to fetch orders',
      message: error.message
    })
  }

  // Transform data to include ticket count and seat numbers
  const ordersWithDetails: OrderWithDetails[] = (orders || []).map((order: any) => {
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

  const totalPages = Math.ceil((count || 0) / limitNum)

  return {
    data: ordersWithDetails,
    total: count || 0,
    page: pageNum,
    limit: limitNum,
    totalPages
  }
})
