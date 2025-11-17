// server/utils/ticketPdf.ts

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { getSupabaseClient } from './supabase'
import { generateQRCodeBuffer } from './qrCode'
import type { Ticket, TicketOrder, ShowSeat, Seat, VenueSection, PriceZone } from '~/types/ticketing'
import type { RecitalShow, RecitalSeries } from '~/types/recitals'
import type { Venue } from '~/types/ticketing'

/**
 * Complete ticket data needed for PDF generation
 */
export interface TicketPDFData {
  ticket: Ticket
  order: TicketOrder
  show: RecitalShow & { series?: RecitalSeries; venue?: Venue }
  seat: Seat & { section?: VenueSection; price_zone?: PriceZone }
  showSeat: ShowSeat
}

/**
 * Fetch complete ticket data from database
 * @param client - Scoped Supabase client (respects RLS)
 * @param ticketId - Ticket UUID
 */
export async function fetchTicketData(client: any, ticketId: string): Promise<TicketPDFData> {

  // Fetch ticket with all related data
  const { data: ticket, error: ticketError } = await client
    .from('tickets')
    .select(`
      *,
      ticket_order:ticket_orders!inner (
        *
      ),
      show_seat:show_seats!inner (
        *,
        seat:seats!inner (
          *,
          section:venue_sections (
            *
          ),
          price_zone:price_zones (
            *
          )
        )
      )
    `)
    .eq('id', ticketId)
    .single()

  if (ticketError || !ticket) {
    throw createError({
      statusCode: 404,
      message: `Ticket not found: ${ticketError?.message || 'Unknown error'}`
    })
  }

  // Fetch show with series and venue
  const { data: show, error: showError } = await client
    .from('recital_shows')
    .select(`
      *,
      series:recital_series (*),
      venue:venues (*)
    `)
    .eq('id', ticket.ticket_order.show_id)
    .single()

  if (showError || !show) {
    throw createError({
      statusCode: 404,
      message: `Show not found: ${showError?.message || 'Unknown error'}`
    })
  }

  return {
    ticket: ticket as any,
    order: ticket.ticket_order as any,
    show: show as any,
    seat: ticket.show_seat.seat as any,
    showSeat: ticket.show_seat as any
  }
}

/**
 * Generate a PDF ticket
 * @param ticketData - Complete ticket data
 * @returns PDF as Uint8Array
 */
export async function generateTicketPDF(ticketData: TicketPDFData): Promise<Uint8Array> {
  const { ticket, order, show, seat, showSeat } = ticketData

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([600, 400]) // 600x400 pt (approx 8.33" x 5.56")

  // Embed fonts
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Colors
  const primaryColor = rgb(0.2, 0.2, 0.6) // Dark blue
  const secondaryColor = rgb(0.4, 0.4, 0.4) // Gray
  const lightGray = rgb(0.9, 0.9, 0.9)

  const { width, height } = page.getSize()
  const margin = 40
  let yPosition = height - margin

  // Draw header background
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width: width,
    height: 80,
    color: primaryColor
  })

  // Title
  const showTitle = show.series?.name
    ? `${show.series.name} - ${show.name}`
    : show.name

  page.drawText(showTitle, {
    x: margin,
    y: height - 50,
    size: 24,
    font: titleFont,
    color: rgb(1, 1, 1)
  })

  yPosition = height - 100

  // Show Details Section
  const showDate = new Date(show.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const showTime = show.start_time || 'TBA'
  const venueName = show.venue?.name || show.location || 'TBA'
  const venueAddress = show.venue?.address
    ? `${show.venue.address}${show.venue.city ? `, ${show.venue.city}` : ''}${show.venue.state ? `, ${show.venue.state}` : ''}`
    : ''

  // Date & Time
  page.drawText('Date & Time:', {
    x: margin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: secondaryColor
  })

  page.drawText(`${showDate} at ${showTime}`, {
    x: margin + 120,
    y: yPosition,
    size: 12,
    font: regularFont,
    color: rgb(0, 0, 0)
  })

  yPosition -= 25

  // Venue
  page.drawText('Venue:', {
    x: margin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: secondaryColor
  })

  page.drawText(venueName, {
    x: margin + 120,
    y: yPosition,
    size: 12,
    font: regularFont,
    color: rgb(0, 0, 0)
  })

  if (venueAddress) {
    yPosition -= 20
    page.drawText(venueAddress, {
      x: margin + 120,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: secondaryColor
    })
  }

  yPosition -= 35

  // Seat Information - Highlighted Box
  const seatBoxY = yPosition - 60
  page.drawRectangle({
    x: margin,
    y: seatBoxY,
    width: 250,
    height: 70,
    color: lightGray,
    borderColor: primaryColor,
    borderWidth: 2
  })

  page.drawText('YOUR SEAT', {
    x: margin + 10,
    y: seatBoxY + 50,
    size: 10,
    font: boldFont,
    color: secondaryColor
  })

  const sectionName = seat.section?.name || 'General'
  const seatInfo = `Section: ${sectionName}\nRow: ${seat.row_name}\nSeat: ${seat.seat_number}`

  const lines = seatInfo.split('\n')
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: margin + 10,
      y: seatBoxY + 30 - (index * 15),
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0)
    })
  })

  yPosition = seatBoxY - 25

  // Ticket Information
  page.drawText('Ticket Number:', {
    x: margin,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: secondaryColor
  })

  page.drawText(ticket.ticket_number, {
    x: margin + 120,
    y: yPosition,
    size: 10,
    font: regularFont,
    color: rgb(0, 0, 0)
  })

  yPosition -= 20

  page.drawText('Order Number:', {
    x: margin,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: secondaryColor
  })

  page.drawText(order.order_number, {
    x: margin + 120,
    y: yPosition,
    size: 10,
    font: regularFont,
    color: rgb(0, 0, 0)
  })

  yPosition -= 20

  page.drawText('Customer:', {
    x: margin,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: secondaryColor
  })

  page.drawText(order.customer_name, {
    x: margin + 120,
    y: yPosition,
    size: 10,
    font: regularFont,
    color: rgb(0, 0, 0)
  })

  // QR Code (right side)
  try {
    const qrCodeBuffer = await generateQRCodeBuffer(ticket.qr_code, 150)
    const qrImage = await pdfDoc.embedPng(qrCodeBuffer)

    const qrSize = 150
    const qrX = width - margin - qrSize
    const qrY = height - 100 - qrSize - 40

    // QR Code background
    page.drawRectangle({
      x: qrX - 10,
      y: qrY - 10,
      width: qrSize + 20,
      height: qrSize + 20,
      color: rgb(1, 1, 1),
      borderColor: primaryColor,
      borderWidth: 2
    })

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize
    })

    // QR Code label
    page.drawText('Scan at entrance', {
      x: qrX + 20,
      y: qrY - 25,
      size: 10,
      font: regularFont,
      color: secondaryColor
    })
  } catch (error) {
    console.error('Failed to add QR code to PDF:', error)
    // Continue without QR code if it fails
  }

  // Footer
  const footerY = 30
  page.drawText('Present this ticket at the venue entrance for admission.', {
    x: margin,
    y: footerY,
    size: 9,
    font: regularFont,
    color: secondaryColor
  })

  page.drawText('Please arrive 15 minutes before showtime.', {
    x: margin,
    y: footerY - 15,
    size: 9,
    font: regularFont,
    color: secondaryColor
  })

  // Serialize the PDF to bytes
  return await pdfDoc.save()
}

/**
 * Upload PDF to Supabase Storage
 * Note: Uses service key for storage operations (no RLS on storage)
 * @param pdfBytes - PDF as Uint8Array
 * @param ticketId - Ticket ID for filename
 * @returns Public URL of the uploaded PDF
 */
export async function uploadTicketPDF(pdfBytes: Uint8Array, ticketId: string): Promise<string> {
  // Storage operations require service key (no RLS on storage)
  const client = getSupabaseClient()
  const fileName = `${ticketId}.pdf`
  const bucketName = 'ticket-pdfs'

  // Upload to Supabase Storage
  const { data, error } = await client.storage
    .from(bucketName)
    .upload(fileName, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true // Overwrite if exists
    })

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to upload PDF: ${error.message}`
    })
  }

  // Get public URL
  const { data: publicUrlData } = client.storage
    .from(bucketName)
    .getPublicUrl(fileName)

  if (!publicUrlData?.publicUrl) {
    throw createError({
      statusCode: 500,
      message: 'Failed to get public URL for PDF'
    })
  }

  return publicUrlData.publicUrl
}

/**
 * Update ticket record with PDF URL
 * @param client - Scoped Supabase client (respects RLS)
 * @param ticketId - Ticket ID
 * @param pdfUrl - PDF URL
 */
export async function updateTicketWithPDF(client: any, ticketId: string, pdfUrl: string): Promise<void> {

  const { error } = await client
    .from('tickets')
    .update({
      pdf_url: pdfUrl,
      pdf_generated_at: new Date().toISOString()
    })
    .eq('id', ticketId)

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to update ticket: ${error.message}`
    })
  }
}

/**
 * Generate PDF for a ticket (complete workflow)
 * @param client - Scoped Supabase client (respects RLS)
 * @param ticketId - Ticket ID
 * @returns PDF URL
 */
export async function generateAndUploadTicketPDF(client: any, ticketId: string): Promise<string> {
  // 1. Fetch ticket data (uses scoped client)
  const ticketData = await fetchTicketData(client, ticketId)

  // 2. Generate PDF
  const pdfBytes = await generateTicketPDF(ticketData)

  // 3. Upload to storage (uses service key)
  const pdfUrl = await uploadTicketPDF(pdfBytes, ticketId)

  // 4. Update ticket record (uses scoped client)
  await updateTicketWithPDF(client, ticketId, pdfUrl)

  return pdfUrl
}

/**
 * Get PDF for a ticket (generate if not exists)
 * @param client - Scoped Supabase client (respects RLS)
 * @param ticketId - Ticket ID
 * @returns PDF URL
 */
export async function getOrGenerateTicketPDF(client: any, ticketId: string): Promise<string> {
  // Check if PDF already exists (uses scoped client - respects RLS)
  const { data: ticket, error } = await client
    .from('tickets')
    .select('pdf_url, pdf_generated_at')
    .eq('id', ticketId)
    .single()

  if (error) {
    throw createError({
      statusCode: 404,
      message: `Ticket not found: ${error.message}`
    })
  }

  // If PDF exists and is recent (within 24 hours), return existing URL
  if (ticket.pdf_url && ticket.pdf_generated_at) {
    const generatedAt = new Date(ticket.pdf_generated_at)
    const now = new Date()
    const hoursSinceGeneration = (now.getTime() - generatedAt.getTime()) / (1000 * 60 * 60)

    if (hoursSinceGeneration < 24) {
      return ticket.pdf_url
    }
  }

  // Otherwise, generate new PDF (uses scoped client)
  return await generateAndUploadTicketPDF(client, ticketId)
}
