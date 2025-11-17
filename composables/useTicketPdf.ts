// composables/useTicketPdf.ts

/**
 * Composable for ticket PDF operations
 */
export function useTicketPdf() {
  const toast = useToast()

  /**
   * Generate PDF for a ticket
   * @param ticketId - Ticket UUID
   * @returns PDF URL
   */
  const generateTicketPdf = async (ticketId: string): Promise<string | null> => {
    try {
      const response = await $fetch<{ success: boolean; data: { pdfUrl: string; ticketId: string; generatedAt: string } }>(
        '/api/tickets/generate-pdf',
        {
          method: 'POST',
          body: { ticketId }
        }
      )

      if (response.success && response.data.pdfUrl) {
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Ticket PDF generated successfully',
          life: 3000
        })
        return response.data.pdfUrl
      }

      return null
    } catch (error: any) {
      console.error('Failed to generate ticket PDF:', error)
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.data?.message || 'Failed to generate ticket PDF',
        life: 5000
      })
      return null
    }
  }

  /**
   * Get PDF URL for a ticket (generates if not exists)
   * @param ticketId - Ticket UUID
   * @returns PDF URL
   */
  const getTicketPdfUrl = async (ticketId: string): Promise<string | null> => {
    try {
      const response = await $fetch<{ success: boolean; data: { pdfUrl: string; ticketId: string } }>(
        `/api/tickets/${ticketId}/pdf-url`
      )

      if (response.success && response.data.pdfUrl) {
        return response.data.pdfUrl
      }

      return null
    } catch (error: any) {
      console.error('Failed to get ticket PDF URL:', error)
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.data?.message || 'Failed to get ticket PDF URL',
        life: 5000
      })
      return null
    }
  }

  /**
   * Download ticket PDF
   * @param ticketId - Ticket UUID
   * @param ticketNumber - Optional ticket number for filename
   */
  const downloadTicketPdf = async (ticketId: string, ticketNumber?: string): Promise<void> => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/download`)

      if (!response.ok) {
        throw new Error('Failed to download PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Use ticket number in filename if provided
      const filename = ticketNumber ? `ticket-${ticketNumber}.pdf` : `ticket-${ticketId}.pdf`
      link.download = filename

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Ticket PDF downloaded successfully',
        life: 3000
      })
    } catch (error: any) {
      console.error('Failed to download ticket PDF:', error)
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to download ticket PDF',
        life: 5000
      })
    }
  }

  /**
   * Generate and download ticket PDF
   * @param ticketId - Ticket UUID
   * @param ticketNumber - Optional ticket number for filename
   */
  const generateAndDownloadTicketPdf = async (
    ticketId: string,
    ticketNumber?: string
  ): Promise<void> => {
    // Generate PDF first
    const pdfUrl = await generateTicketPdf(ticketId)

    if (pdfUrl) {
      // Then download it
      await downloadTicketPdf(ticketId, ticketNumber)
    }
  }

  /**
   * Open ticket PDF in new tab
   * @param ticketId - Ticket UUID
   */
  const openTicketPdf = async (ticketId: string): Promise<void> => {
    try {
      const pdfUrl = await getTicketPdfUrl(ticketId)

      if (pdfUrl) {
        window.open(pdfUrl, '_blank')
      }
    } catch (error: any) {
      console.error('Failed to open ticket PDF:', error)
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to open ticket PDF',
        life: 5000
      })
    }
  }

  /**
   * Generate PDFs for multiple tickets (bulk operation)
   * @param ticketIds - Array of ticket UUIDs
   * @returns Array of successful PDF URLs
   */
  const generateBulkTicketPdfs = async (ticketIds: string[]): Promise<string[]> => {
    const successfulUrls: string[] = []

    for (const ticketId of ticketIds) {
      const pdfUrl = await generateTicketPdf(ticketId)
      if (pdfUrl) {
        successfulUrls.push(pdfUrl)
      }
    }

    toast.add({
      severity: 'info',
      summary: 'Bulk Generation Complete',
      detail: `Generated ${successfulUrls.length} of ${ticketIds.length} ticket PDFs`,
      life: 5000
    })

    return successfulUrls
  }

  return {
    generateTicketPdf,
    getTicketPdfUrl,
    downloadTicketPdf,
    generateAndDownloadTicketPdf,
    openTicketPdf,
    generateBulkTicketPdfs
  }
}
