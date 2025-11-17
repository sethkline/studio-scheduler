// server/api/tickets/generate-pdf.post.ts

import { generateAndUploadTicketPDF } from '~/server/utils/ticketPdf'

/**
 * Generate PDF for a ticket
 * POST /api/tickets/generate-pdf
 *
 * Body: { ticketId: string }
 * Returns: { pdfUrl: string, ticketId: string }
 */
export default defineEventHandler(async (event) => {
  try {
    // Parse request body
    const body = await readBody(event)
    const { ticketId } = body

    if (!ticketId) {
      throw createError({
        statusCode: 400,
        message: 'ticketId is required'
      })
    }

    // Validate ticketId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(ticketId)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid ticketId format'
      })
    }

    // Generate and upload PDF
    const pdfUrl = await generateAndUploadTicketPDF(ticketId)

    return {
      success: true,
      data: {
        ticketId,
        pdfUrl,
        generatedAt: new Date().toISOString()
      }
    }
  } catch (error: any) {
    console.error('PDF generation error:', error)

    // Re-throw createError errors
    if (error.statusCode) {
      throw error
    }

    // Handle other errors
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to generate PDF'
    })
  }
})
