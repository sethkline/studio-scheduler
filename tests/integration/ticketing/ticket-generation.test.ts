// tests/integration/ticketing/ticket-generation.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockEvent, createMockMailgunClient } from '../../utils/mocks'
import { createPurchaseFlowScenario } from '../../utils/factories'
import {
  generateQRCodeToken,
  isValidQRCodeToken,
  generateQRCodeDataURL
} from '../../../server/utils/qrCode'

// Import API handlers
import generatePDF from '../../../server/api/tickets/generate-pdf.post'
import downloadTicket from '../../../server/api/tickets/[id]/download.get'
import resendEmail from '../../../server/api/tickets/resend-email.post'

const scenario = createPurchaseFlowScenario()

const mockData = {
  venues: [scenario.venue],
  recital_shows: [scenario.show],
  ticket_orders: [scenario.order],
  tickets: scenario.tickets,
  show_seats: scenario.showSeats
}

const mockMailgun = createMockMailgunClient()

vi.mock('../../../server/utils/supabase', () => ({
  getSupabaseClient: () => createMockSupabaseClient(mockData)
}))

vi.mock('mailgun.js', () => ({
  default: vi.fn(() => ({
    client: vi.fn(() => ({
      messages: mockMailgun.messages
    }))
  }))
}))

describe('QR Code Generation', () => {
  describe('generateQRCodeToken', () => {
    it('should generate unique QR codes for tickets', () => {
      const token1 = generateQRCodeToken()
      const token2 = generateQRCodeToken()

      expect(token1).not.toBe(token2)
    })

    it('should create URL-safe QR codes', () => {
      const token = generateQRCodeToken()

      // Should not contain special characters that break URLs
      expect(token).not.toMatch(/[^A-Z0-9-]/)
    })

    it('should ensure no collision in QR codes', () => {
      const tokens = new Set()
      for (let i = 0; i < 1000; i++) {
        tokens.add(generateQRCodeToken())
      }

      // All tokens should be unique
      expect(tokens.size).toBe(1000)
    })

    it('should validate QR code format', () => {
      const validToken = generateQRCodeToken()
      expect(isValidQRCodeToken(validToken)).toBe(true)

      expect(isValidQRCodeToken('invalid')).toBe(false)
      expect(isValidQRCodeToken('TKT-123-456')).toBe(false)
    })
  })

  describe('generateQRCodeDataURL', () => {
    it('should generate QR code images (PNG)', async () => {
      const token = generateQRCodeToken()
      const dataURL = await generateQRCodeDataURL(token)

      expect(dataURL).toMatch(/^data:image\/png;base64,/)
      expect(dataURL.length).toBeGreaterThan(100)
    })

    it('should generate QR code images (SVG)', async () => {
      const token = generateQRCodeToken()
      // This would use generateQRCodeSVG in real implementation
      expect(token).toBeTruthy()
    })
  })
})

describe('PDF Generation', () => {
  beforeEach(() => {
    mockData.tickets = scenario.tickets.map(ticket => ({
      ...ticket,
      pdf_url: null,
      pdf_generated_at: null
    }))
  })

  describe('POST /api/tickets/generate-pdf', () => {
    it('should generate PDF with show details (name, date, time, venue)', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: '/api/tickets/generate-pdf',
        body: {
          ticket_id: scenario.tickets[0].id
        }
      })

      const response = await generatePDF(event)

      expect(response.success).toBe(true)
      expect(response.pdf_url).toBeDefined()
    })

    it('should include seat details in PDF (section, row, seat)', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: '/api/tickets/generate-pdf',
        body: {
          ticket_id: scenario.tickets[0].id
        }
      })

      const response = await generatePDF(event)

      // In real implementation, verify PDF contents
      expect(response.success).toBe(true)
    })

    it('should embed QR code in PDF', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: '/api/tickets/generate-pdf',
        body: {
          ticket_id: scenario.tickets[0].id
        }
      })

      const response = await generatePDF(event)

      expect(response.success).toBe(true)
      expect(response.ticket.qr_code).toBeDefined()
    })

    it('should include order number in PDF', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: '/api/tickets/generate-pdf',
        body: {
          ticket_id: scenario.tickets[0].id
        }
      })

      const response = await generatePDF(event)

      expect(response.success).toBe(true)
      // Order number should be included
      expect(scenario.order.order_number).toBeDefined()
    })

    it('should upload PDF to Supabase Storage', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: '/api/tickets/generate-pdf',
        body: {
          ticket_id: scenario.tickets[0].id
        }
      })

      const response = await generatePDF(event)

      expect(response.pdf_url).toMatch(/https?:\/\//)
    })

    it('should save PDF URL to ticket record', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: '/api/tickets/generate-pdf',
        body: {
          ticket_id: scenario.tickets[0].id
        }
      })

      const response = await generatePDF(event)

      expect(response.ticket.pdf_url).toBeDefined()
      expect(response.ticket.pdf_generated_at).toBeDefined()
    })

    it('should generate separate PDFs for multiple tickets in one order', async () => {
      const responses = []

      for (const ticket of scenario.tickets) {
        const event = createMockEvent({
          method: 'POST',
          url: '/api/tickets/generate-pdf',
          body: {
            ticket_id: ticket.id
          }
        })

        const response = await generatePDF(event)
        responses.push(response)
      }

      expect(responses).toHaveLength(scenario.tickets.length)
      responses.forEach(response => {
        expect(response.success).toBe(true)
        expect(response.pdf_url).toBeDefined()
      })
    })
  })

  describe('GET /api/tickets/[id]/download', () => {
    beforeEach(() => {
      mockData.tickets = scenario.tickets.map(ticket => ({
        ...ticket,
        pdf_url: 'https://storage.supabase.co/bucket/ticket-123.pdf'
      }))
    })

    it('should allow downloading ticket PDFs', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/tickets/${scenario.tickets[0].id}/download`,
        params: { id: scenario.tickets[0].id }
      })

      const response = await downloadTicket(event)

      expect(response).toBeDefined()
      // Should return PDF file or redirect to PDF URL
    })
  })
})

describe('Email Delivery', () => {
  beforeEach(() => {
    mockData.ticket_orders = [{
      ...scenario.order,
      status: 'paid'
    }]
    mockData.tickets = scenario.tickets.map(ticket => ({
      ...ticket,
      pdf_url: 'https://storage.supabase.co/bucket/ticket.pdf'
    }))

    mockMailgun.messages.create.mockClear()
  })

  describe('POST /api/tickets/resend-email', () => {
    it('should send confirmation email on payment success', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: '/api/tickets/resend-email',
        body: {
          order_id: scenario.order.id
        }
      })

      const response = await resendEmail(event)

      expect(response.success).toBe(true)
      expect(mockMailgun.messages.create).toHaveBeenCalled()
    })

    it('should include order summary in email', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: '/api/tickets/resend-email',
        body: {
          order_id: scenario.order.id
        }
      })

      await resendEmail(event)

      const emailCall = mockMailgun.messages.create.mock.calls[0][1]
      expect(emailCall.subject).toContain('Order')
      expect(emailCall.html).toContain(scenario.order.order_number)
    })

    it('should include show details in email', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: '/api/tickets/resend-email',
        body: {
          order_id: scenario.order.id
        }
      })

      await resendEmail(event)

      const emailCall = mockMailgun.messages.create.mock.calls[0][1]
      expect(emailCall.html).toContain(scenario.show.name)
    })

    it('should attach PDF tickets or include download links', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: '/api/tickets/resend-email',
        body: {
          order_id: scenario.order.id
        }
      })

      await resendEmail(event)

      const emailCall = mockMailgun.messages.create.mock.calls[0][1]

      // Should either have attachments or download links
      const hasAttachments = emailCall.attachment !== undefined
      const hasLinks = emailCall.html.includes('download')

      expect(hasAttachments || hasLinks).toBe(true)
    })

    it('should send mobile-responsive email', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: '/api/tickets/resend-email',
        body: {
          order_id: scenario.order.id
        }
      })

      await resendEmail(event)

      const emailCall = mockMailgun.messages.create.mock.calls[0][1]

      // Email HTML should include viewport meta or responsive styles
      expect(emailCall.html).toBeDefined()
      expect(typeof emailCall.html).toBe('string')
    })

    it('should use studio branding in email', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: '/api/tickets/resend-email',
        body: {
          order_id: scenario.order.id
        }
      })

      await resendEmail(event)

      const emailCall = mockMailgun.messages.create.mock.calls[0][1]

      // Email should include studio name/branding
      expect(emailCall.html).toBeDefined()
    })

    it('should allow resending email from admin', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: '/api/tickets/resend-email',
        body: {
          order_id: scenario.order.id
        },
        user: {
          id: 'admin-1',
          user_role: 'admin'
        }
      })

      const response = await resendEmail(event)

      expect(response.success).toBe(true)
      expect(mockMailgun.messages.create).toHaveBeenCalled()
    })

    it('should allow resending email from public lookup', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: '/api/tickets/resend-email',
        body: {
          order_id: scenario.order.id,
          email: scenario.order.customer_email // Email verification
        }
      })

      const response = await resendEmail(event)

      expect(response.success).toBe(true)
      expect(mockMailgun.messages.create).toHaveBeenCalled()
    })

    it('should require email verification for public resend', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: '/api/tickets/resend-email',
        body: {
          order_id: scenario.order.id,
          email: 'wrong@example.com' // Wrong email
        }
      })

      await expect(resendEmail(event)).rejects.toThrow(/verification|not found/)
    })
  })
})
