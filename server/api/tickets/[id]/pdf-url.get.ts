// server/api/tickets/[id]/pdf-url.get.ts

import { getOrGenerateTicketPDF } from '~/server/utils/ticketPdf'

/**
 * Get ticket PDF URL (generates if not exists)
 * GET /api/tickets/:id/pdf-url
 *
 * Returns: { pdfUrl: string, ticketId: string }
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

    // Get or generate PDF URL
    const pdfUrl = await getOrGenerateTicketPDF(ticketId)

    return {
      success: true,
      data: {
        ticketId,
        pdfUrl
      }
    }
  } catch (error: any) {
    console.error('PDF URL retrieval error:', error)

    // Re-throw createError errors
    if (error.statusCode) {
      throw error
    }

    // Handle other errors
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to get PDF URL'
    })
  }
})
