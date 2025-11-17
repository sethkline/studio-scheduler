// server/api/ticket-orders/[id].get.ts

import type { TicketOrder } from '~/types/ticketing'
import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event): Promise<{ order: TicketOrder }> => {
  const client = getSupabaseClient()

  try {
    // Get order ID from route params
    const orderId = getRouterParam(event, 'id')

    if (!orderId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Order ID is required'
      })
    }

    // Fetch order with all related data
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .select(`
        *,
        tickets (
          id,
          show_seat_id,
          qr_code,
          ticket_number,
          pdf_url,
          pdf_generated_at,
          scanned_at,
          scanned_by,
          created_at,
          updated_at,
          show_seats (
            id,
            seat_id,
            price_in_cents,
            status,
            seats (
              id,
              row_name,
              seat_number,
              seat_type,
              venue_sections (
                id,
                name
              ),
              price_zones (
                id,
                name,
                price_in_cents,
                color
              )
            )
          )
        ),
        order_items:ticket_order_items (
          id,
          item_type,
          item_name,
          quantity,
          price_in_cents,
          ticket_id,
          created_at
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order not found'
      })
    }

    // Transform the data to flatten nested relationships
    if (order.tickets) {
      order.tickets = order.tickets.map((ticket: any) => {
        const showSeat = ticket.show_seats
        const seat = showSeat?.seats
        const section = seat?.venue_sections
        const priceZone = seat?.price_zones

        return {
          ...ticket,
          show_seat: {
            ...showSeat,
            row_name: seat?.row_name,
            seat_number: seat?.seat_number,
            seat_type: seat?.seat_type,
            section: section?.name,
            section_id: section?.id,
            price_zone_id: priceZone?.id,
            price_zone_name: priceZone?.name,
            price_zone_color: priceZone?.color
          }
        }
      })
    }

    return {
      order
    }
  } catch (error: any) {
    console.error('Error fetching order:', error)

    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error
    }

    // Generic error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch order'
    })
  }
})
