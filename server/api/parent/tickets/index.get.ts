import { requireAuth, requireRole } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireRole(event, ['parent', 'admin', 'staff'])

  const client = await getUserSupabaseClient(event)
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  try {
    // Get all ticket purchases for this user (from orders table)
    const { data: orders, error: ordersError } = await client
      .from('orders')
      .select(`
        *,
        tickets(
          *,
          seat:seats(row, seat_number, section),
          recital_show:recital_shows(
            id,
            name,
            date,
            start_time,
            end_time,
            location,
            recital_series:recital_series(name, theme)
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.warn('Error fetching tickets:', ordersError)
      return {
        tickets: [],
        orders: [],
      }
    }

    // Flatten tickets from orders
    const tickets = orders?.flatMap((order: any) =>
      (order.tickets || []).map((ticket: any) => ({
        ...ticket,
        order_id: order.id,
        purchase_date: order.created_at,
      }))
    ) || []

    return {
      tickets,
      orders: orders || [],
    }
  } catch (error: any) {
    console.error('Error fetching tickets:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch tickets',
    })
  }
})
