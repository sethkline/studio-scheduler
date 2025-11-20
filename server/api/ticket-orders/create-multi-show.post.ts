// server/api/ticket-orders/create-multi-show.post.ts

import { serverSupabaseClient } from '#supabase/server'
import { getReservationSessionId } from '~/server/utils/reservationSession'

interface CartItem {
  show_id: string
  seat_ids: string[]
}

interface CreateMultiShowOrderRequest {
  customer_name: string
  customer_email: string
  customer_phone?: string
  items: CartItem[]
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  try {
    // Get session ID (works for both authenticated and anonymous users)
    const sessionId = await getReservationSessionId(event)

    // Get user ID if authenticated
    const { data: { user } } = await client.auth.getUser()
    const userId = user?.id || null

    // Read and validate request body
    const body = await readBody<CreateMultiShowOrderRequest>(event)

    const { customer_name, customer_email, customer_phone, items } = body

    // Validate required fields
    if (!customer_name || !customer_email || !items || items.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: customer_name, customer_email, items'
      })
    }

    // Validate maximum shows per order
    if (items.length > 10) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Maximum 10 shows per order'
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customer_email)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid email address'
      })
    }

    // Arrays to track all seats and reservations
    let allSeats: any[] = []
    const reservationTokens: Record<string, string> = {}
    let totalAmountInCents = 0

    // Step 1: Reserve seats for each show
    for (const item of items) {
      const { show_id, seat_ids } = item

      if (!show_id || !seat_ids || seat_ids.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Each item must have show_id and seat_ids'
        })
      }

      // Get seat details and verify availability
      const { data: seats, error: seatsError } = await client
        .from('show_seats')
        .select(`
          id,
          recital_show_id,
          seat_id,
          price_in_cents,
          status,
          seats (
            id,
            row_name,
            seat_number,
            venue_sections (
              name
            )
          )
        `)
        .eq('recital_show_id', show_id)
        .in('id', seat_ids)

      if (seatsError || !seats || seats.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: `Could not retrieve seat information for show ${show_id}`
        })
      }

      // Verify all seats are available
      const unavailableSeats = seats.filter((seat: any) => seat.status !== 'available')
      if (unavailableSeats.length > 0) {
        throw createError({
          statusCode: 400,
          statusMessage: `Some seats are no longer available for show ${show_id}`
        })
      }

      // Generate reservation token
      const reservationToken = `res_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

      // Create reservation for this show
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + 10) // 10-minute expiration

      const { data: reservation, error: reservationError } = await client
        .from('seat_reservations')
        .insert({
          recital_show_id: show_id,
          reservation_token: reservationToken,
          session_id: sessionId,
          user_id: userId,
          expires_at: expiresAt.toISOString(),
          is_active: true
        })
        .select()
        .single()

      if (reservationError || !reservation) {
        // Cleanup: release all previously reserved seats
        for (const token of Object.values(reservationTokens)) {
          await client
            .from('seat_reservations')
            .update({ is_active: false })
            .eq('reservation_token', token)
        }

        throw createError({
          statusCode: 500,
          statusMessage: `Failed to create reservation for show ${show_id}`
        })
      }

      // Create reservation_seats entries
      const reservationSeats = seat_ids.map(seat_id => ({
        reservation_id: reservation.id,
        show_seat_id: seat_id
      }))

      const { error: reservationSeatsError } = await client
        .from('reservation_seats')
        .insert(reservationSeats)

      if (reservationSeatsError) {
        // Cleanup: release all previously reserved seats
        for (const token of Object.values(reservationTokens)) {
          await client
            .from('seat_reservations')
            .update({ is_active: false })
            .eq('reservation_token', token)
        }

        throw createError({
          statusCode: 500,
          statusMessage: `Failed to reserve seats for show ${show_id}`
        })
      }

      // Update show_seats status to 'reserved'
      const { error: updateSeatsError } = await client
        .from('show_seats')
        .update({ status: 'reserved' })
        .in('id', seat_ids)

      if (updateSeatsError) {
        // Cleanup: release all previously reserved seats
        for (const token of Object.values(reservationTokens)) {
          await client
            .from('seat_reservations')
            .update({ is_active: false })
            .eq('reservation_token', token)
        }

        throw createError({
          statusCode: 500,
          statusMessage: `Failed to update seat status for show ${show_id}`
        })
      }

      // Track reservation token for this show
      reservationTokens[show_id] = reservationToken

      // Add seats to total collection
      allSeats = [...allSeats, ...seats]

      // Add to total amount
      const showTotal = seats.reduce((sum: number, seat: any) => {
        return sum + (seat.price_in_cents || 0)
      }, 0)
      totalAmountInCents += showTotal
    }

    // Step 2: Generate order number
    const { data: orderNumberData, error: orderNumberError } = await client
      .rpc('generate_order_number')

    if (orderNumberError || !orderNumberData) {
      // Cleanup: release all reserved seats
      for (const token of Object.values(reservationTokens)) {
        await client
          .from('seat_reservations')
          .update({ is_active: false })
          .eq('reservation_token', token)
      }

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to generate order number'
      })
    }

    const orderNumber = orderNumberData

    // Step 3: Create a single ticket order for all shows
    // Note: We'll create one order with multiple tickets from different shows
    // The order doesn't have a single show_id, but tickets link to their respective shows
    const { data: order, error: orderError } = await client
      .from('ticket_orders')
      .insert({
        show_id: items[0].show_id, // Use first show as primary (for backward compatibility)
        customer_name,
        customer_email,
        customer_phone: customer_phone || null,
        total_amount_in_cents: totalAmountInCents,
        status: 'pending',
        order_number: orderNumber,
        session_id: sessionId,
        user_id: userId
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Error creating multi-show order:', orderError)

      // Cleanup: release all reserved seats
      for (const token of Object.values(reservationTokens)) {
        await client
          .from('seat_reservations')
          .update({ is_active: false })
          .eq('reservation_token', token)
      }

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create ticket order'
      })
    }

    // Step 4: Create tickets for each seat across all shows
    const ticketsToCreate = allSeats.map((seat: any) => ({
      ticket_order_id: order.id,
      show_seat_id: seat.id
    }))

    const { data: tickets, error: ticketsError } = await client
      .from('tickets')
      .insert(ticketsToCreate)
      .select()

    if (ticketsError) {
      console.error('Error creating tickets:', ticketsError)

      // Cleanup
      await client.from('ticket_orders').delete().eq('id', order.id)
      for (const token of Object.values(reservationTokens)) {
        await client
          .from('seat_reservations')
          .update({ is_active: false })
          .eq('reservation_token', token)
      }

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create tickets'
      })
    }

    // Step 5: Create order items for each ticket
    const orderItemsToCreate = allSeats.map((seat: any, index: number) => {
      const seatInfo = seat.seats
      const section = seatInfo?.venue_sections?.name || 'Unknown'
      const itemName = `${section} - Row ${seatInfo?.row_name} Seat ${seatInfo?.seat_number}`

      return {
        ticket_order_id: order.id,
        item_type: 'ticket',
        item_name: itemName,
        quantity: 1,
        price_in_cents: seat.price_in_cents,
        ticket_id: tickets[index].id
      }
    })

    const { error: orderItemsError } = await client
      .from('ticket_order_items')
      .insert(orderItemsToCreate)

    if (orderItemsError) {
      console.error('Error creating order items:', orderItemsError)
      // Continue anyway, items are not critical
    }

    // Step 6: Format response with show breakdown
    const orderItems = items.map(item => {
      const showSeats = allSeats.filter((s: any) => s.recital_show_id === item.show_id)
      const subtotal = showSeats.reduce((sum: number, seat: any) => sum + (seat.price_in_cents || 0), 0)

      return {
        show_id: item.show_id,
        seats: showSeats,
        subtotal_in_cents: subtotal
      }
    })

    return {
      success: true,
      order: {
        ...order,
        items: orderItems,
        total_amount_in_cents: totalAmountInCents
      },
      reservation_tokens: reservationTokens,
      message: 'Multi-show order created successfully'
    }
  } catch (error: any) {
    console.error('Error in create multi-show order endpoint:', error)

    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error
    }

    // Otherwise, create a generic error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'An unexpected error occurred while creating the multi-show order'
    })
  }
})
