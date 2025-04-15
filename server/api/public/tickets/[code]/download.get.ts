// server/api/public/tickets/[code]/download.get.ts
import { getSupabaseClient } from '../../../../utils/supabase'
import PDFDocument from 'pdfkit'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const code = getRouterParam(event, 'code')
    
    // Get ticket details
    const { data: ticket, error: ticketError } = await client
      .from('tickets')
      .select(`
        id,
        ticket_code,
        price_in_cents,
        is_valid,
        order:order_id (
          id,
          customer_name,
          email,
          payment_status
        ),
        seat:seat_id (
          id,
          section,
          row_name,
          seat_number,
          seat_type,
          handicap_access,
          show:recital_show_id (
            id,
            name,
            date,
            start_time,
            location
          )
        )
      `)
      .eq('ticket_code', code)
      .single()
    
    if (ticketError) throw ticketError
    
    // Check if payment is completed
    if (ticket.order.payment_status !== 'completed') {
      return createError({
        statusCode: 400,
        statusMessage: 'Payment for this ticket has not been completed'
      })
    }
    
    // Format date and time
    const showDate = new Date(ticket.seat.show.date)
    const formattedDate = showDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    // Create PDF document
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 50
    })
    
    // Set response headers
    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Content-Disposition', `attachment; filename="ticket-${code}.pdf"`)
    
    // Pipe PDF to response
    const chunks = []
    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => {
      const result = Buffer.concat(chunks)
      return result
    })
    
    // Build PDF content
    doc.fontSize(25).text('Dance Studio Recital Ticket', { align: 'center' })
    doc.moveDown()
    
    doc.fontSize(18).text(ticket.seat.show.name, { align: 'center' })
    doc.fontSize(14).text(formattedDate, { align: 'center' })
    doc.fontSize(14).text(`Time: ${ticket.seat.show.start_time}`, { align: 'center' })
    doc.fontSize(14).text(`Location: ${ticket.seat.show.location}`, { align: 'center' })
    doc.moveDown()
    
    doc.fontSize(12).text(`Customer: ${ticket.order.customer_name}`)
    doc.fontSize(12).text(`Section: ${ticket.seat.section}`)
    doc.fontSize(12).text(`Row: ${ticket.seat.row_name}`)
    doc.fontSize(12).text(`Seat: ${ticket.seat.seat_number}`)
    doc.moveDown()
    
    if (ticket.seat.handicap_access) {
      doc.fontSize(10).text('This is a handicap accessible seat', { 
        align: 'center',
        italic: true
      })
      doc.moveDown()
    }
    
    // Add QR code placeholder text
    doc.fontSize(14).text('TICKET CODE', { align: 'center' })
    doc.fontSize(16).text(ticket.ticket_code, { align: 'center' })
    doc.moveDown()
    
    // Add terms and conditions
    doc.fontSize(8).text('Terms and Conditions:', { underline: true })
    doc.fontSize(8).text('This ticket is only valid for the performance listed above. No refunds or exchanges. Ticket must be presented at the venue for entry.', {
      align: 'left',
      width: 500
    })
    
    // Finalize the PDF and end the stream
    doc.end()
    
    return doc
  } catch (error) {
    console.error('Download ticket API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to generate ticket PDF'
    })
  }
})