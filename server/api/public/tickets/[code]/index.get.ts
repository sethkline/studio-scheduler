// server/api/public/tickets/[code]/index.get.ts
/**
 * SECURITY FIX: PUBLIC API - Get Ticket by QR Code
 *
 * USE CASES:
 * 1. Customer viewing their own ticket (knows QR code from email/PDF)
 * 2. Door staff scanning ticket for validation (needs to verify authenticity)
 *
 * SECURITY MEASURES:
 * 1. Uses serverSupabaseClient (RLS-aware) instead of service key
 * 2. Minimizes PII exposure - only returns essential ticket validation info
 * 3. Does NOT return: customer_email, customer_phone, full order details
 * 4. Rate limiting should be added at the infrastructure level (Cloudflare, API Gateway)
 *
 * THREAT MODEL:
 * - QR codes can leak via screenshots, forwarded emails, social media
 * - Anyone with a QR code should NOT be able to access customer PII
 * - Only essential info needed for ticket validation is returned
 */

import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ticket code is required'
    })
  }

  try {
    // SECURITY FIX: Use RLS-aware client instead of service key
    const client = await serverSupabaseClient(event)

    // Get minimal ticket details for validation
    const { data: ticket, error: ticketError } = await client
      .from('tickets')
      .select(`
        id,
        ticket_number,
        qr_code,
        pdf_url,
        scanned_at,
        created_at,
        ticket_order:ticket_orders!tickets_ticket_order_id_fkey (
          id,
          order_number,
          customer_name,
          status,
          show:recital_shows!ticket_orders_show_id_fkey (
            id,
            title,
            show_date,
            show_time,
            venue:venues (
              id,
              name
            )
          )
        ),
        show_seat:show_seats!tickets_show_seat_id_fkey (
          id,
          price_in_cents,
          seat:seats (
            id,
            row_name,
            seat_number,
            seat_type,
            section:venue_sections (
              id,
              name
            )
          )
        )
      `)
      .eq('qr_code', code)
      .maybeSingle()

    if (ticketError) {
      console.error('Ticket fetch error:', ticketError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch ticket'
      })
    }

    if (!ticket) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Ticket not found'
      })
    }

    // Check if order/payment is valid
    const order = ticket.ticket_order as any
    if (!order || order.status !== 'paid') {
      throw createError({
        statusCode: 400,
        statusMessage: 'This ticket is not valid - payment not completed or refunded'
      })
    }

    // SECURITY: Return minimal information - only what's needed for ticket validation
    // Do NOT include: customer_email, customer_phone, detailed customer info
    const show = order.show as any
    const seat = ticket.show_seat as any

    return {
      success: true,
      ticket: {
        // Ticket info
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        qrCode: ticket.qr_code,
        pdfUrl: ticket.pdf_url,
        scannedAt: ticket.scanned_at,
        isScanned: !!ticket.scanned_at,
        createdAt: ticket.created_at,

        // Order info (minimal)
        order: {
          orderNumber: order.order_number,
          customerName: order.customer_name, // Needed for door staff to verify ID
          // SECURITY: NO customer_email, NO customer_phone
        },

        // Show info
        show: show ? {
          id: show.id,
          title: show.title,
          showDate: show.show_date,
          showTime: show.show_time,
          venue: show.venue ? {
            name: show.venue.name
            // SECURITY: NO detailed address
          } : null
        } : null,

        // Seat info
        seat: seat?.seat ? {
          section: seat.seat.section?.name || 'General',
          row: seat.seat.row_name,
          number: seat.seat.seat_number,
          type: seat.seat.seat_type,
          price: seat.price_in_cents
        } : null
      }
    }
  } catch (error: any) {
    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error
    }

    console.error('Get ticket API error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch ticket'
    })
  }
})
