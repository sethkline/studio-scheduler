// server/api/tickets/[id]/download.get.ts

import { getOrGenerateTicketPDF, fetchTicketData } from '~/server/utils/ticketPdf'
import { getSupabaseClient } from '~/server/utils/supabase'
import { requireTicketAccess } from '~/server/utils/auth'

/**
 * Download ticket PDF
 * GET /api/tickets/:id/download
 *
 * Security: Requires authentication + (ticket owner OR admin/staff)
 *
 * Returns: PDF file
 */
export default defineEventHandler(async (event) => {
  try {
    // Get ticket ID from route params
    const ticketId = getRouterParam(event, 'id')

    if (!ticketId) {
      throw createError({
        statusCode: 400,
        message: 'Ticket ID is required'
      })
    }

    // Validate ticketId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(ticketId)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid ticket ID format'
      })
    }

    // Check authentication and authorization
    // Throws 401 if not authenticated, 403 if not owner/staff
    await requireTicketAccess(event, ticketId)

    // Get scoped Supabase client (respects RLS)
    const client = await serverSupabaseClient(event)

    // Get or generate PDF URL
    const pdfUrl = await getOrGenerateTicketPDF(client, ticketId)

    // Fetch ticket data for filename
    const ticketData = await fetchTicketData(client, ticketId)
    const fileName = `ticket-${ticketData.ticket.ticket_number}.pdf`

    // Fetch the PDF from Supabase Storage (uses service key for storage)
    const storageClient = getSupabaseClient()
    const { data, error } = await storageClient.storage
      .from('ticket-pdfs')
      .download(`${ticketId}.pdf`)

    if (error || !data) {
      throw createError({
        statusCode: 404,
        message: 'PDF file not found'
      })
    }

    // Convert blob to buffer
    const buffer = Buffer.from(await data.arrayBuffer())

    // Set response headers for PDF download
    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Content-Disposition', `attachment; filename="${fileName}"`)
    setHeader(event, 'Content-Length', buffer.length.toString())

    return buffer
  } catch (error: any) {
    console.error('PDF download error:', error)

    // Re-throw createError errors
    if (error.statusCode) {
      throw error
    }

    // Handle other errors
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to download PDF'
    })
  }
})
