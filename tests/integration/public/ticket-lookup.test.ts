// tests/integration/public/ticket-lookup.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockEvent } from '../../utils/mocks'
import { createPurchaseFlowScenario, createTestOrder } from '../../utils/factories'

// Import API handlers (these may need to be created)
import lookupOrders from '../../../server/api/public/orders/lookup.get'
import getOrder from '../../../server/api/public/orders/[id].get'

const scenario = createPurchaseFlowScenario()

const customerEmail = 'customer@example.com'
const orders = [
  createTestOrder({
    id: 'order-1',
    show_id: scenario.show.id,
    customer_email: customerEmail,
    status: 'paid'
  }),
  createTestOrder({
    id: 'order-2',
    show_id: scenario.show.id,
    customer_email: customerEmail,
    status: 'paid'
  })
]

const mockData = {
  recital_shows: [scenario.show],
  venues: [scenario.venue],
  ticket_orders: orders,
  tickets: scenario.tickets
}

vi.mock('../../../server/utils/supabase', () => ({
  getSupabaseClient: () => createMockSupabaseClient(mockData)
}))

describe('Ticket Lookup', () => {
  describe('GET /api/public/orders/lookup', () => {
    it('should allow customer to search by email', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/public/orders/lookup?email=${customerEmail}`,
        query: { email: customerEmail }
      })

      const response = await lookupOrders(event)

      expect(response.orders).toBeDefined()
      expect(response.orders.length).toBeGreaterThan(0)
    })

    it('should show all orders for email', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/public/orders/lookup?email=${customerEmail}`,
        query: { email: customerEmail }
      })

      const response = await lookupOrders(event)

      expect(response.orders).toHaveLength(2)
      response.orders.forEach((order: any) => {
        expect(order.customer_email).toBe(customerEmail)
      })
    })

    it('should require email verification (security)', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/public/orders/lookup?email=wrong@example.com',
        query: { email: 'wrong@example.com' }
      })

      const response = await lookupOrders(event)

      // Should return empty array, not error
      expect(response.orders).toHaveLength(0)
    })

    it('should validate email format', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/public/orders/lookup?email=invalid-email',
        query: { email: 'invalid-email' }
      })

      await expect(lookupOrders(event)).rejects.toThrow(/email|invalid/)
    })
  })

  describe('GET /api/public/orders/[id]', () => {
    it('should show order details (show, seats, date)', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/public/orders/${orders[0].id}?email=${customerEmail}`,
        params: { id: orders[0].id },
        query: { email: customerEmail }
      })

      const response = await getOrder(event)

      expect(response.order).toBeDefined()
      expect(response.order.id).toBe(orders[0].id)
      expect(response.order.show).toBeDefined()
      expect(response.tickets).toBeDefined()
    })

    it('should allow downloading ticket PDFs', async () => {
      mockData.tickets = scenario.tickets.map(ticket => ({
        ...ticket,
        pdf_url: 'https://storage.supabase.co/bucket/ticket.pdf'
      }))

      const event = createMockEvent({
        method: 'GET',
        url: `/api/public/orders/${orders[0].id}?email=${customerEmail}`,
        params: { id: orders[0].id },
        query: { email: customerEmail }
      })

      const response = await getOrder(event)

      expect(response.tickets).toBeDefined()
      response.tickets.forEach((ticket: any) => {
        expect(ticket.pdf_url).toBeDefined()
      })
    })

    it('should require email verification to view order', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/public/orders/${orders[0].id}?email=wrong@example.com`,
        params: { id: orders[0].id },
        query: { email: 'wrong@example.com' }
      })

      await expect(getOrder(event)).rejects.toThrow(/not found|verification/)
    })

    it('should return 404 for non-existent order', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/public/orders/non-existent?email=${customerEmail}`,
        params: { id: 'non-existent' },
        query: { email: customerEmail }
      })

      await expect(getOrder(event)).rejects.toThrow(/not found/)
    })
  })
})
